import Icon from "../Icon";
import { useState } from "react";
import type { Data, Row } from "../types";
import { rows, findEvent, fmtDay, fmtWhen, fmtMD, weightLabel, changesAt, changeTip, type Sel } from "../lib";

type SortKey = "exam" | "deadline" | "quota" | "school";

export default function Compare({ data, now, nearKin, sel, mine, setMine }: {
  data: Data; now: Date; nearKin: boolean; sel: Sel; mine: string[]; setMine: (v: string[]) => void;
}) {
  const [sort, setSort] = useState<SortKey>("exam");
  const list = rows(data, nearKin).filter((r) => sel(r.school.id));

  const examOf = (r: Row) => r.group.exam_day ?? findEvent(r.school, "exam")?.start ?? "9999";
  const deadlineOf = (r: Row) => findEvent(r.school, "register")?.end ?? "9999";
  const sorted = [...list].sort((a, b) => {
    // 已查證的排前面
    if (a.school.status !== b.school.status) return a.school.status === "verified" ? -1 : 1;
    if (sort === "quota") return (b.group.quota.general ?? -1) - (a.group.quota.general ?? -1);
    if (sort === "deadline") return deadlineOf(a).localeCompare(deadlineOf(b));
    if (sort === "school") return a.school.short.localeCompare(b.school.short, "zh-Hant");
    return examOf(a).localeCompare(examOf(b));
  });

  return (
    <section className="card">
      <div className="sortbar">
        排序：
        {([["exam", "考試日"], ["deadline", "報名截止"], ["quota", "名額"], ["school", "學校"]] as const).map(([k, l]) => (
          <button key={k} className={sort === k ? "chipbtn on" : "chipbtn"} onClick={() => setSort(k)}>{l}</button>
        ))}
      </div>
      {sorted.length === 0 && <p className="empty">這所學校的 116 簡章還沒公告，也還沒有參考資料。請看「待公告」分頁。</p>}
      <div className="table-wrap">
        <table className="cmp freeze">
          <thead>
            <tr>
              <th>學校／系所組</th>
              <th className="num">名額</th>
              <th>報名</th>
              <th>考試</th>
              <th>放榜</th>
              <th>筆試科目與配分</th>
              <th>同分參酌</th>
              <th className="num">報名費</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ school: s, program: p, group: g }) => {
              const reg = findEvent(s, "register");
              const exam = findEvent(s, "exam");
              const res = findEvent(s, "result");
              const ref = s.status === "pending";
              const ch = changesAt(s, [`group:${g.id}`, "schedule.register", "schedule.exam", "schedule.result", "fee", "school"], now);
              const star = mine.includes(s.id);
              return (
                <tr key={g.id} data-focus={`cmp-${g.id}`} className={`${p.kind === "near_kin" ? "nk" : ""} ${ref ? "ref" : ""}`}>
                  <td className="who">
                    <div className="school">
                      <button className={`star ${star ? "on" : ""}`} title={star ? "從我的志願移除" : "加入我的志願"} aria-pressed={star}
                        onClick={() => setMine(star ? mine.filter((x) => x !== s.id) : [...mine, s.id])}><Icon name="star" fill={star} /></button>
                      {s.short}
                      {ref && <span className="badge ref">{s.reference_year} 參考</span>}
                      {p.kind === "near_kin" && <span className="badge nk">近親所</span>}
                      {p.review_only && <span className="badge warn">只書審</span>}
                    </div>
                    <div className="prog">{p.name}</div>
                    {g.name !== "—" && <div className="grp">{g.name}{g.code && <span className="code"> #{g.code}</span>}</div>}
                    {p.exclusive_groups && <div className="hint">各組不得同時報考</div>}
                    {ch.length > 0 && <div className="badge changed" title={changeTip(ch)}><Icon name="warn" /> {fmtMD(ch[0].date)} 有更正</div>}
                    <div className="verified">{ref ? `${s.reference_year} 簡章` : "簡章"}查證 {fmtMD(s.brochure.verified)}</div>
                  </td>
                  <td className="num">
                    <b>{g.quota.general ?? "—"}</b>
                    {g.quota_note && <div className="hint">{g.quota_note}</div>}
                  </td>
                  <td className="nowrap">{reg ? fmtWhen(reg).split(" – ").map((x, i) => <div key={i}>{i ? "– " : ""}{x}</div>) : "—"}</td>
                  <td className="nowrap">{g.exam_day ? fmtDay(g.exam_day) : exam?.start ? fmtWhen(exam) : "—"}
                    {s.venue && <div className="hint" title={s.venue.place}><Icon name="pin" /> {s.venue.city}{s.venue.choose ? "（可選）" : ""}</div>}</td>
                  <td className="nowrap">{res?.start ? fmtDay(res.start) : "—"}</td>
                  <td>
                    {g.papers.length === 0 && <span className="hint">{g.papers_note ?? "待整理"}</span>}
                    <ul className="papers">
                      {g.papers.map((paper) => (
                        <li key={paper.name}>
                          <span className="w">{weightLabel(paper)}</span>
                          <span>{paper.name}</span>
                          {paper.period && <small className="hint"> · {paper.period}</small>}
                        </li>
                      ))}
                    </ul>
                    {g.papers.length > 0 && (g.papers_note || g.notes?.length || g.scoring) && (
                      <details className="more">
                        <summary>計分與備註</summary>
                        {g.scoring && <div className="hint">· {g.scoring}</div>}
                        {g.papers_note && <div className="hint">· {g.papers_note}</div>}
                        {g.calculator && <div className="hint">· 計算機：{g.calculator}</div>}
                        {g.notes?.map((n) => <div key={n} className="hint">· {n}</div>)}
                        {p.notes?.map((n) => <div key={n} className="hint">· {n}</div>)}
                      </details>
                    )}
                  </td>
                  <td>
                    {g.tie_break ? <ol className="tie">{g.tie_break.map((t) => <li key={t}>{t}</li>)}</ol> : "—"}
                  </td>
                  <td className="num">
                    {s.fee ? `$${s.fee.amount.toLocaleString()}` : "—"}
                    {s.fee?.note && <div className="hint">{s.fee.note}</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
