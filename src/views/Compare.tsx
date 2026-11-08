import Icon from "../Icon";
import { useState } from "react";
import { useCopyLink, linkVerb } from "../useCopyLink";
import type { Data, Row } from "../types";
import { rows, findEvent, fmtDay, fmtWhen, fmtMD, fmtTime, weightLabel, changesAt, changeTip, regStatus, type Sel } from "../lib";

type SortKey = "exam" | "deadline" | "quota" | "school";

export default function Compare({ data, now, nearKin, sel, mine, setMine }: {
  data: Data; now: Date; nearKin: boolean; sel: Sel; mine: string[]; setMine: (v: string[]) => void;
}) {
  const [sort, setSort] = useState<SortKey>("exam");
  // 單一系所組連結：#compare:cmp-<組別 id>，打開會捲到該列
  const [copied, copyLink] = useCopyLink("compare");
  const list = rows(data, nearKin).filter((r) => sel(r.school.id));
  // 7 天內新加入的學校標「新加入」
  const since = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const fresh = new Set(data.updates.filter((u) => u.kind === "new" && u.date >= since).flatMap((u) => u.schools ?? []));

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
        {sorted.length > 0 && (() => {
          const all = new Set(sorted.map((r) => r.school.id)).size;
          const refs = new Set(sorted.filter((r) => r.school.status === "pending").map((r) => r.school.id)).size;
          return <span className="count">共 {sorted.length} 個系所組・{all} 所學校{refs > 0 && `（${refs} 所為往年參考）`}</span>;
        })()}
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
              const rs = regStatus(s, now);
              return (
                <tr key={g.id} data-focus={`cmp-${g.id}`} className={`${p.kind === "near_kin" ? "nk" : ""} ${ref ? "ref" : ""}`}>
                  <td className="who">
                    <div className="school">
                      <button className={`star ${star ? "on" : ""}`} title={star ? "從我的志願移除" : "加入我的志願"} aria-pressed={star}
                        onClick={() => setMine(star ? mine.filter((x) => x !== s.id) : [...mine, s.id])}><Icon name="star" fill={star} /></button>
                      {s.short}
                      <button className="lnk" title={`${linkVerb}這個系所組的連結`} aria-label={`${linkVerb}${s.short}${p.name}${g.name !== "—" ? g.name : ""}的連結`}
                        onClick={() => copyLink(`cmp-${g.id}`, `${s.short} ${p.name}${g.name !== "—" ? " " + g.name : ""}｜上岸地圖`)}>{copied === `cmp-${g.id}` ? <span className="lnk-ok">已複製</span> : <Icon name="link" />}</button>
                      {fresh.has(s.id) && <span className="badge new">新加入</span>}
                      {ref && <span className="badge ref">{s.reference_year} 參考</span>}
                      {p.kind === "near_kin" && <span className="badge nk">近親所</span>}
                      {p.review_only && <span className="badge warn">不考筆試</span>}
                    </div>
                    <div className="prog">{p.name}</div>
                    {p.review_only && <div className="hint">{p.review_method}</div>}
                    {g.name !== "—" && <div className="grp">{g.name}{g.code && <span className="code"> #{g.code}</span>}</div>}
                    {p.exclusive_groups && <div className="hint">各組不得同時報考</div>}
                    {ch.length > 0 && <div className="badge changed" title={changeTip(ch)}><Icon name="warn" /> {fmtMD(ch[0].date)} 有更正</div>}
                    <div className="verified"><a href={s.brochure.url} target="_blank" rel="noreferrer" title={s.brochure.title}>{ref ? `${s.reference_year} 簡章` : "簡章"}<Icon name="out" /></a>・查證 {fmtMD(s.brochure.verified)}</div>
                  </td>
                  <td className="num" data-label="名額">
                    <b>{g.quota.general ?? "—"}</b>
                    {g.quota_note && <div className="hint">{g.quota_note}</div>}
                  </td>
                  <td className="nowrap" data-label="報名">{reg ? fmtWhen(reg).split(" – ").map((x, i) => <div key={i}>{i ? "– " : ""}{x}</div>) : "—"}
                    {rs?.state === "open" && <div className="regst open">報名中・{rs.days === 0 ? `今天 ${fmtTime(rs.end)} 截止` : `${rs.days} 天後截止`}</div>}
                    {rs?.state === "closed" && <div className="regst closed">報名已截止</div>}</td>
                  <td className="nowrap" data-label="考試">{g.exam_day ? fmtDay(g.exam_day) : exam?.start ? fmtWhen(exam) : "—"}
                    {s.venue && <div className="hint" title={s.venue.place}><Icon name="pin" /> {s.venue.city}{s.venue.choose ? "（可選）" : ""}</div>}</td>
                  <td className="nowrap" data-label="放榜">{res?.start ? fmtDay(res.start) : "—"}</td>
                  <td data-label="筆試科目與配分">
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
                  <td data-label="同分參酌">
                    {g.tie_break ? <ol className="tie">{g.tie_break.map((t) => <li key={t}>{t}</li>)}</ol> : "—"}
                  </td>
                  <td className="num" data-label="報名費">
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
