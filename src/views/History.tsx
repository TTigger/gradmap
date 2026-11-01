import Icon from "../Icon";
import type { Data, HistoryRecord, HistorySchool } from "../types";
import { fmtMD, type Sel } from "../lib";
import TrendChart from "./TrendChart";

const fmtN = (n?: number) => (n == null ? "—" : n.toLocaleString());
const YEARS = [115, 114, 113];

function rate(r: HistoryRecord): number | null {
  if (!r.applicants || r.admitted == null) return null;
  return (r.admitted / r.applicants) * 100;
}

/** 某校某年某指標的資料狀態：A 官方 / B 第三方 / 無 */
function cov(h: HistorySchool | undefined, year: number, key: "applicants" | "admitted" | "min_score"): "A" | "B" | null {
  const recs = h?.records.filter((r) => r.year === year && r[key] != null) ?? [];
  if (!recs.length) return null;
  return recs.some((r) => h!.sources[r.src.split(" ")[0]]?.grade === "A") ? "A" : "B";
}
const METRICS = [["applicants", "報名"], ["admitted", "錄取"], ["min_score", "分數"]] as const;

export default function History({ data, sel, go }: { data: Data; sel: Sel; go: (id: string) => void }) {
  const list = data.registry.filter((r) => sel(r.id));
  const histOf = (id: string) => data.history.find((h) => h.school === id);
  const withData = list.filter((r) => (histOf(r.id)?.records.length ?? 0) > 0);
  const maxApplicants = Math.max(1, ...data.history.flatMap((h) => h.records.map((r) => r.applicants ?? 0)));

  return (
    <section className="card">
      <p className="lead">
        113–115 學年度<b>考試入學</b>（不含甄試）的報名、錄取與最低錄取分數，只收各校官方公布的統計；新聞數字另外標成第三方。
        <b>錄取率＝正取人數 ÷ 報名人數</b>（不含備取遞補）。
      </p>

      <TrendChart data={data} sel={sel} />

      <h3 className="sec-h">各校公開了哪些數據</h3>
      <p className="hint">很多學校只公布報名人數，或完全沒有公開統計，所以下表很多格是空的。每週排程會持續找，找到官方檔案就補上。</p>
      <div className="table-wrap">
        <table className="cov freeze">
          <thead>
            <tr>
              <th rowSpan={2}>學校</th>
              {YEARS.map((y) => <th key={y} colSpan={3} className="yr">{y}</th>)}
              <th rowSpan={2}>官方公開情況</th>
            </tr>
            <tr>{YEARS.flatMap((y) => METRICS.map(([k, l]) => <th key={y + k} className="m">{l}</th>))}</tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const h = histOf(r.id);
              const has = (h?.records.length ?? 0) > 0;
              return (
                <tr key={r.id} data-focus={`hs-${r.id}`}>
                  <td className="who">
                    {has ? <button className="linkbtn" onClick={() => go(`hd-${r.id}`)}>{r.short}</button> : <span>{r.short}</span>}
                  </td>
                  {YEARS.flatMap((y) => METRICS.map(([k, l]) => {
                    const g = cov(h, y, k);
                    return (
                      <td key={y + k} className="c">
                        <span className={`cv ${g ? "g" + g : "none"}`} title={`${r.short} ${y} ${l}：${g === "A" ? "有官方數字" : g === "B" ? "只有新聞數字" : "沒有找到"}`}>
                          {g === "A" ? "●" : g === "B" ? "○" : "·"}
                        </span>
                      </td>
                    );
                  }))}
                  <td className="pub">
                    {h?.published ?? "還沒整理。"}
                    {!has && r.links.filter((l) => l.kind === "admission").slice(0, 1).map((l) => (
                      <a key={l.url} href={l.url} target="_blank" rel="noreferrer"> 招生網站<Icon name="out" /></a>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="hint cov-key"><span className="cv gA">●</span> 官方數字　<span className="cv gB">○</span> 只有新聞數字　<span className="cv none">·</span> 沒有找到</p>

      {withData.map((r) => {
        const h = histOf(r.id)!;
        const recs = [...h.records].sort((a, b) => b.year - a.year || Number(!!b.main) - Number(!!a.main));
        return (
          <div key={r.id} className="hist" data-focus={`hd-${r.id}`}>
            <h3>{r.name}</h3>
            <div className="table-wrap">
              <table className="hist-t freeze">
                <thead>
                  <tr>
                    <th>學年度／系所組</th>
                    <th className="num">名額</th>
                    <th className="num">報名</th>
                    <th className="num">正取</th>
                    <th className="num">備取</th>
                    <th>錄取率</th>
                    <th className="num">最低錄取分數</th>
                    <th>來源・查證</th>
                  </tr>
                </thead>
                <tbody>
                  {recs.map((x, i) => {
                    const rt = rate(x);
                    const sid = x.src.split(" ")[0];
                    const src = h.sources[sid];
                    return (
                      <tr key={i} className={x.program.includes("近親所") ? "nk" : ""}>
                        <td className="who">
                          <div className="school">{x.year}</div>
                          <div className="grp">{x.program}{x.group ? ` ${x.group}` : ""}</div>
                        </td>
                        <td className="num">{fmtN(x.quota)}</td>
                        <td className="num">
                          <b>{fmtN(x.applicants)}</b>
                          {x.applicants != null && <span className="hbar" style={{ width: `${(x.applicants / maxApplicants) * 100}%` }} />}
                        </td>
                        <td className="num">{fmtN(x.admitted)}</td>
                        <td className="num">{fmtN(x.waitlist)}</td>
                        <td className="nowrap">{rt == null ? "—" : `${rt.toFixed(1)}%`}</td>
                        <td className="num">
                          <b>{typeof x.min_score === "number" ? x.min_score.toFixed(2) : x.min_score ?? "—"}</b>
                          {x.min_score_note && <div className="hint">{x.min_score_note}</div>}
                        </td>
                        <td>
                          {src ? (
                            <a href={src.url} target="_blank" rel="noreferrer" title={src.title}>
                              <span className={`grade g${src.grade}`}>{src.grade}</span> {x.src.slice(sid.length).trim() || "原始資料"}<Icon name="out" />
                            </a>
                          ) : x.src}
                          {src?.checked && <span className="verified"> 查證 {fmtMD(src.checked)}</span>}
                          {x.note && <div className="hint">{x.note}</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="hint">{h.published}</p>
            {h.school === "ntu" && <p className="hint">台大的最低錄取分數是各系所加權後的總分，每年配分可能不同，不能直接跨年比高低。</p>}
          </div>
        );
      })}
    </section>
  );
}
