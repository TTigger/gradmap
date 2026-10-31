import type { Data } from "../types";
import { rows, weightLabel } from "../lib";

const COLS = ["LA", "DM", "DS", "ALG", "CO", "OS", "EN", "SEC"];

export default function Matrix({ data, nearKin }: { data: Data; nearKin: boolean }) {
  const examOf = (r: { school: { status: string; schedule: { type: string; start?: string }[] }; group: { exam_day?: string } }) =>
    (r.school.status === "verified" ? "0" : "1") + (r.group.exam_day ?? r.school.schedule.find((e) => e.type === "exam")?.start ?? "9");
  const list = rows(data, nearKin)
    .filter((r) => r.group.papers.length > 0 || r.program.review_only)
    .sort((a, b) => examOf(a).localeCompare(examOf(b)));
  // 同校有多個班別（例：中央資工／軟工／AI）時，顯示班別名而不是組別名
  const multiProgram = (sid: string) => data.schools.find((s) => s.id === sid)!.programs.filter((p) => p.kind === "main").length > 1;
  return (
    <section className="card">
      <p className="lead">
        每格顯示「該科所在試卷的配分」。同一列中顏色相同的格子＝同一張考卷（例：中央的資結和演算法是同一張卷，權重 ×1）。滑鼠移到格子上可看試卷名稱和節次。
      </p>
      <div className="table-wrap">
        <table className="mx">
          <thead>
            <tr>
              <th>學校／組別</th>
              {COLS.map((c) => (
                <th key={c} title={data.subjects[c]?.name}>
                  <span className="mx-code">{c}</span>
                  <span className="mx-name">{data.subjects[c]?.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map(({ school: s, program: p, group: g }) => (
              <tr key={g.id} className={s.status === "pending" ? "ref" : ""}>
                <td className="who">
                  <div className="school">
                    {s.short}
                    {s.status === "pending" && <span className="badge ref">{s.reference_year} 參考</span>}
                    {p.kind === "near_kin" && <span className="badge nk">近親所</span>}
                  </div>
                  <div className="grp">
                    {p.kind === "near_kin" || p.name.includes("聯合") || multiProgram(s.id) ? p.name.replace(/^資訊工程學系/, "資工系 ") : g.name}
                  </div>
                </td>
                {p.review_only ? (
                  <td colSpan={COLS.length} className="mx-review">只書審，不考筆試</td>
                ) : (
                  COLS.map((c) => {
                    const idx = g.papers.findIndex((pp) => pp.covers.includes(c));
                    if (idx < 0) return <td key={c} className="mx-empty">·</td>;
                    const paper = g.papers[idx];
                    const sub = paper.sub_weights?.[c];
                    return (
                      <td key={c} className={`mx-cell p${idx % 5}`} title={`${paper.name}${paper.period ? "｜" + paper.period : ""}`}>
                        <b>{weightLabel(paper)}</b>
                        {sub != null && <small>卷內 {sub}%</small>}
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint">「—」代表簡章沒有明列比例；政大「加重計分」欄空白，推定三科等權重。</p>
    </section>
  );
}
