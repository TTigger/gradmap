import { Fragment, useState } from "react";
import type { Data } from "../types";
import { rows, weightLabel } from "../lib";
import type { Sel } from "../lib";

const COLS = ["LA", "DM", "DS", "ALG", "CO", "OS", "EN", "SEC"];

export default function Matrix({ data, nearKin, sel }: { data: Data; nearKin: boolean; sel: Sel }) {
  const examOf = (r: { school: { status: string; schedule: { type: string; start?: string }[] }; group: { exam_day?: string } }) =>
    (r.school.status === "verified" ? "0" : "1") + (r.group.exam_day ?? r.school.schedule.find((e) => e.type === "exam")?.start ?? "9");
  const list = rows(data, nearKin)
    .filter((r) => sel(r.school.id))
    .filter((r) => r.group.papers.length > 0 || r.program.review_only)
    .sort((a, b) => examOf(a).localeCompare(examOf(b)));
  // 同校有多個班別（例：中央資工／軟工／AI）時，顯示班別名而不是組別名
  // 點格子：在該列下方展開這組的每張考卷（手機沒有滑鼠停留提示）
  const [open, setOpen] = useState<string | null>(null);
  const multiProgram = (sid: string) => data.schools.find((s) => s.id === sid)!.programs.filter((p) => p.kind === "main").length > 1;
  return (
    <section className="card">
      <p className="lead">
        每格顯示「該科所在試卷的配分」。同一列中顏色相同的格子＝同一張考卷（例：中央的資結和演算法是同一張卷，權重 ×1）。點有配分的格子，可在下方看到這組每張考卷的名稱和節次。
      </p>
      <div className="table-wrap">
        <table className="mx freeze">
          <thead>
            <tr>
              <th>學校／組別</th>
              {COLS.map((c) => (
                <th key={c} title={data.subjects[c]?.name} data-focus={`mxc-${c}`}>
                  <span className="mx-code">{c}</span>
                  <span className="mx-name">{data.subjects[c]?.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map(({ school: s, program: p, group: g }) => (
              <Fragment key={g.id}>
              <tr data-focus={`mx-${g.id}`} className={s.status === "pending" ? "ref" : ""}>
                <td className="who">
                  <div className="school">
                    {s.short}
                    {s.status === "pending" && <span className="badge ref">{s.reference_year} 參考</span>}
                    {p.kind === "near_kin" && <span className="badge nk">近親所</span>}
                  </div>
                  <div className="grp">
                    {p.kind === "near_kin" || p.name.includes("聯合") || multiProgram(s.id) ? p.name.replace(/^資訊工程學系/, "資工系 ") : g.name}
                  </div>
                  {!p.review_only && g.papers.filter((pp) => pp.covers.length === 0).map((pp) => (
                    <div key={pp.name} className="mx-broad" title={pp.period}>另考 {pp.name} <b>{weightLabel(pp)}</b></div>
                  ))}
                </td>
                {p.review_only ? (
                  <td colSpan={COLS.length} className="mx-review">不考筆試：{p.review_method}</td>
                ) : (
                  COLS.map((c) => {
                    const idx = g.papers.findIndex((pp) => pp.covers.includes(c));
                    if (idx < 0) return <td key={c} className="mx-empty">·</td>;
                    const paper = g.papers[idx];
                    const sub = paper.sub_weights?.[c];
                    return (
                      <td key={c} className={`mx-cell p${idx % 5}${open === g.id ? " on" : ""}`} title={`${paper.name}${paper.period ? "｜" + paper.period : ""}`}
                        tabIndex={0} role="button" aria-expanded={open === g.id} aria-label={`${s.short} ${paper.name} ${weightLabel(paper)}，顯示這組的考卷`}
                        onClick={() => setOpen(open === g.id ? null : g.id)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(open === g.id ? null : g.id); } }}>
                        <b>{weightLabel(paper)}</b>
                        {sub != null && <small>卷內 {sub}%</small>}
                      </td>
                    );
                  })
                )}
              </tr>
              {open === g.id && (
                <tr className="mx-detail">
                  <td colSpan={COLS.length + 1}>
                    <div className="mx-detail-in">
                      <div className="mx-detail-h">{s.short} {p.name}{g.name !== "—" ? ` ${g.name}` : ""}<button className="mx-x" aria-label="收起" onClick={() => setOpen(null)}>×</button></div>
                      <ul>
                        {g.papers.map((pp, i) => (
                          <li key={pp.name}><span className={`mx-dot p${i % 5}`} /><b>{weightLabel(pp)}</b> {pp.name}{pp.period && <small className="hint"> · {pp.period}</small>}</li>
                        ))}
                      </ul>
                    </div>
                  </td>
                </tr>
              )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint">「—」代表簡章沒有明列比例；「另考」是範圍較廣、無法對應到單一科目的考科（例如計算機概論），列在學校名稱下方。政大「加重計分」欄空白，推定三科等權重。</p>
    </section>
  );
}
