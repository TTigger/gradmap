import { useState } from "react";
import type { Data } from "./types";
import Popover from "./Popover";
import { buildIcs } from "../shared/ics.mjs";

/** 行事曆：訂閱全部／單校（會自動更新），或下載「我的志願」那幾校 */
export default function IcsMenu({ data, mine }: { data: Data; mine: string[] }) {
  const verified = data.schools.filter((s) => s.status === "verified");
  const mineV = verified.filter((s) => mine.includes(s.id));
  const [copied, setCopied] = useState("");
  const abs = (p: string) => new URL(p, location.href).href;
  const copy = async (p: string) => {
    try { await navigator.clipboard.writeText(abs(p)); setCopied(p); setTimeout(() => setCopied(""), 1600); } catch { /* 不支援就略過 */ }
  };
  const downloadMine = () => {
    const blob = new Blob([buildIcs(mineV, "上岸地圖・我的志願")], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "gradmap-我的志願.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const Row = ({ path, label }: { path: string; label: string }) => (
    <li>
      <span>{label}</span>
      <a href={path} download>下載</a>
      <button className="linkbtn" onClick={() => copy(path)}>{copied === path ? "已複製 ✓" : "複製訂閱網址"}</button>
    </li>
  );
  return (
    <Popover align="right" className="btn" label={<>
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M7 2v3M17 2v3M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
      行事曆 ▾</>}>
      {() => (
        <div className="ics">
          <p className="hint">「訂閱網址」貼到 Google 日曆（其他日曆 → 透過網址新增）或 Apple 行事曆，日期有更正會自動更新；「下載」是一次性匯入。只收已查證學校的日期，報名截止、考試前一天會提醒。</p>
          <button className="btn primary" disabled={!mineV.length} onClick={downloadMine}>
            下載我的志願（{mineV.length} 校）
          </button>
          {mine.length > 0 && mineV.length < mine.length && <p className="hint">志願中有 {mine.length - mineV.length} 校簡章還沒公告，公告後再下載一次。</p>}
          {!mine.length && <p className="hint">先在「★ 我的志願」勾選學校。</p>}
          <ul>
            <Row path="gradmap.ics" label="全部已查證學校" />
            {verified.map((s) => <Row key={s.id} path={`ics/${s.id}.ics`} label={s.short} />)}
          </ul>
        </div>
      )}
    </Popover>
  );
}
