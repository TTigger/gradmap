import { useEffect, useMemo, useRef, useState } from "react";
import type { Data } from "./types";
import { buildIndex, search, type Hit, type Target } from "./search";

const EXAMPLES = ["台師大", "報名截止", "1/26", "2月 考試", "作業系統", "報到", "最低錄取分數", "考古題"];

export default function SearchBox({ data, onPick }: { data: Data; onPick: (t: Target) => void }) {
  const index = useMemo(() => buildIndex(data), [data]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const hits = useMemo(() => search(index, q), [index, q]);

  // 按「/」直接跳到搜尋框
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const pick = (h: Hit) => {
    onPick(h.target);
    setOpen(false);
    input.current?.blur();
  };

  return (
    <div className="search" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
      <svg className="search-ico" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        ref={input}
        type="search"
        value={q}
        placeholder="搜尋學校、日期、報名／考試／報到、科目…（按 / ）"
        aria-label="搜尋"
        role="combobox"
        aria-expanded={open}
        aria-controls="search-list"
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQ(e.target.value); setSel(0); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, hits.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
          else if (e.key === "Enter" && hits[sel]) pick(hits[sel]);
          else if (e.key === "Escape") { setOpen(false); input.current?.blur(); }
        }}
      />
      {open && (
        <div className="search-pop" id="search-list" role="listbox">
          {!q.trim() && (
            <div className="search-ex">
              <span className="hint">試試：</span>
              {EXAMPLES.map((x) => (
                <button key={x} type="button" className="chipbtn" onMouseDown={(e) => e.preventDefault()} onClick={() => { setQ(x); setSel(0); input.current?.focus(); }}>{x}</button>
              ))}
            </div>
          )}
          {q.trim() && hits.length === 0 && <div className="search-none">找不到「{q}」。可以試試校名、月份（例：2月）或「考試」。</div>}
          {hits.map((h, i) => (
            <button
              key={h.kind + h.title + h.sub}
              type="button"
              role="option"
              aria-selected={i === sel}
              className={`search-hit ${i === sel ? "on" : ""}`}
              onMouseEnter={() => setSel(i)}
              onClick={() => pick(h)}
            >
              <span className={`search-kind k-${h.kind}`}>{h.kind}</span>
              <span className="search-title">{h.title}</span>
              <span className="search-sub">{h.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
