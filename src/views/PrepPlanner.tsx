import { useEffect, useState } from "react";
import type { Data, Row } from "../types";
import { rows, type Sel } from "../lib";
import type { Target } from "../search";

const ORDER = ["DS", "ALG", "CO", "OS", "LA", "DM", "EN", "SEC"];
const DEFAULT = ["DS", "ALG", "CO", "OS", "LA", "DM"];

function load(): string[] {
  try { return JSON.parse(localStorage.getItem("gm.prep") ?? "null") ?? DEFAULT; } catch { return DEFAULT; }
}

/** 一份準備能報幾校：勾選準備的科目，列出考科完全符合／只差一科的組別 */
export default function PrepPlanner({ data, nearKin, sel, go }: { data: Data; nearKin: boolean; sel: Sel; go: (t: Target) => void }) {
  const [have, setHave] = useState<string[]>(load);
  useEffect(() => { try { localStorage.setItem("gm.prep", JSON.stringify(have)); } catch { /* 略過 */ } }, [have]);
  const toggle = (c: string) => setHave(have.includes(c) ? have.filter((x) => x !== c) : [...have, c]);

  const all = rows(data, nearKin).filter((r) => sel(r.school.id));
  const written = all.filter((r) => r.group.papers.length > 0);
  const reviewOnly = all.filter((r) => r.program.review_only);
  const need = (r: Row) => [...new Set(r.group.papers.flatMap((p) => p.covers))];
  const miss = (r: Row) => need(r).filter((c) => !have.includes(c));
  const ok = written.filter((r) => miss(r).length === 0);
  const one = written.filter((r) => miss(r).length === 1);
  const more = written.filter((r) => miss(r).length >= 2);
  const name = (c: string) => data.subjects[c]?.name ?? c;

  const Chip = ({ r, extra }: { r: Row; extra?: string }) => (
    <button className={`pp-chip ${r.program.kind === "near_kin" ? "nk" : ""}`} onClick={() => go({ tab: "compare", focusId: `cmp-${r.group.id}` })}
      title="到比較表看這一組">
      <b>{r.school.short}</b> {/^(不分組|—)/.test(r.group.name) ? r.program.name : r.group.name}
      {r.school.status === "pending" && <span className="badge ref">{r.school.reference_year} 參考</span>}
      {extra && <small className="pp-miss">差 {extra}</small>}
    </button>
  );

  return (
    <section className="card pp">
      <h3 className="sec-h first">一份準備能報幾校？</h3>
      <p className="hint">勾選你準備的科目，下面會列出考科完全涵蓋、只差一科的系所組。以科目為單位計算（例：「計算機系統」那張卷同時考計組和作業系統，兩科都要勾）。點系所組可以跳到比較表。</p>
      <div className="pp-subjects">
        {ORDER.filter((c) => data.subjects[c]).map((c) => (
          <label key={c} className={have.includes(c) ? "on" : ""}>
            <input type="checkbox" checked={have.includes(c)} onChange={() => toggle(c)} />
            {name(c)}
          </label>
        ))}
      </div>
      <div className="pp-result">
        <div>
          <h4>✅ 考科完全涵蓋 <span className="pp-n">{ok.length}</span></h4>
          {ok.length ? ok.map((r) => <Chip key={r.group.id} r={r} />) : <p className="hint">目前沒有。</p>}
        </div>
        <div>
          <h4>➕ 只差一科 <span className="pp-n">{one.length}</span></h4>
          {one.length ? one.map((r) => <Chip key={r.group.id} r={r} extra={name(miss(r)[0])} />) : <p className="hint">目前沒有。</p>}
        </div>
        {more.length > 0 && (
          <details>
            <summary>差兩科以上（{more.length}）</summary>
            {more.map((r) => <Chip key={r.group.id} r={r} extra={miss(r).map(name).join("、")} />)}
          </details>
        )}
        {reviewOnly.length > 0 && (
          <details>
            <summary>不考筆試、只看書審（{reviewOnly.length}）</summary>
            {reviewOnly.map((r) => <Chip key={r.group.id} r={r} />)}
          </details>
        )}
      </div>
      <p className="hint">只計算已整理考科的學校（116 已查證＋參考年度）。簡章還沒公告的學校不在內；台科大、北科大等考「資工概論」「計算機概論」類綜合科目的學校，整理後也會列進來。</p>
    </section>
  );
}
