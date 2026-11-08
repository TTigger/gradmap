import { useEffect, useRef, useState } from "react";
import type { Data } from "../types";
import type { Sel } from "../lib";

// 顏色跟著學校走（不因篩選改變）；順序依 dataviz 參考色盤，已驗證色盲可辨
const SLOT: Record<string, number> = { ntu: 1, ntnu: 2, nccu: 3, nchu: 4, nycu: 5, ncku: 6, ccu: 7 };
const YEARS = [113, 114, 115];

interface Pt { year: number; v: number; grade: "A" | "B"; label: string; note?: string }
interface Series { id: string; short: string; slot: number; pts: Pt[] }

/** 各校資工本所報名人數趨勢（只畫 history 裡標 main 的列） */
export default function TrendChart({ data, sel }: { data: Data; sel: Sel }) {
  const [hover, setHover] = useState<{ s: Series; p: Pt; x: number; y: number } | null>(null);
  // 依容器實際寬度畫，手機上字不會被縮小
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, Math.min(760, Math.round(e.contentRect.width)))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const series: Series[] = data.history
    .filter((h) => sel(h.school) && SLOT[h.school])
    .map((h) => ({
      id: h.school,
      short: data.registry.find((r) => r.id === h.school)?.short ?? h.school,
      slot: SLOT[h.school],
      pts: h.records
        .filter((r) => r.main && r.applicants != null)
        .map((r) => ({
          year: r.year, v: r.applicants!, grade: h.sources[r.src.split(" ")[0]]?.grade ?? "A",
          label: `${r.program}${r.group ? " " + r.group : ""}`, note: r.note,
        }))
        .sort((a, b) => a.year - b.year),
    }))
    .filter((s) => s.pts.length)
    .sort((a, b) => a.slot - b.slot);
  if (!series.length) return null;

  const H = W < 480 ? 240 : 260, L = 40, R = W < 480 ? 104 : 132, T = 14, B = 30;
  const max = Math.max(...series.flatMap((s) => s.pts.map((p) => p.v)));
  const step = max > 1500 ? 500 : 250;
  const top = Math.ceil(max / step) * step;
  const x = (yr: number) => L + ((yr - YEARS[0]) / (YEARS.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - v / top) * (H - T - B);
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);

  // 右側直接標籤：依最後一點的高度排序，太近就往下推
  // 沒有最新一年資料的學校，標籤放在最後一點旁邊，避免看起來像延伸到 115
  const endYear = YEARS[YEARS.length - 1];
  const labels = series.filter((s) => s.pts[s.pts.length - 1].year === endYear).map((s) => {
    const last = s.pts[s.pts.length - 1];
    return { s, last, ly: y(last.v) };
  }).sort((a, b) => a.ly - b.ly);
  const inline = series.filter((s) => s.pts[s.pts.length - 1].year !== endYear).map((s) => ({ s, last: s.pts[s.pts.length - 1] }));
  for (let i = 1; i < labels.length; i++) labels[i].ly = Math.max(labels[i].ly, labels[i - 1].ly + 15);

  return (
    <figure className="trend">
      <figcaption>
        <b>資工本所報名人數</b>
        <span className="trend-legend">
          {series.map((s) => <span key={s.id}><i style={{ background: `var(--series-${s.slot})` }} />{s.short}</span>)}
          <span><i className="hollow" />空心＝新聞數字（第三方）</span>
        </span>
      </figcaption>
      <div className="trend-box" ref={box}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="各校資工所 113–115 學年度考試入學報名人數折線圖，詳細數字見下方表格">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R + 8} y1={y(t)} y2={y(t)} className="grid" />
              <text x={L - 8} y={y(t) + 4} className="axis" textAnchor="end">{t.toLocaleString()}</text>
            </g>
          ))}
          {YEARS.map((yr) => <text key={yr} x={x(yr)} y={H - 8} className="axis" textAnchor="middle">{yr}{W < 480 ? "" : " 學年度"}</text>)}
          {series.map((s) => {
            const solid = s.pts.filter((p) => p.grade === "A");
            return (
              <g key={s.id} style={{ color: `var(--series-${s.slot})` }}>
                {solid.length > 1 && (
                  <polyline fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round"
                    points={solid.map((p) => `${x(p.year)},${y(p.v)}`).join(" ")} />
                )}
                {s.pts.map((p) => (
                  <g key={p.year}>
                    <circle cx={x(p.year)} cy={y(p.v)} r={5} className={p.grade === "A" ? "dot" : "dot hollow"} />
                    <circle cx={x(p.year)} cy={y(p.v)} r={14} fill="transparent"
                      onMouseEnter={() => setHover({ s, p, x: x(p.year) / W, y: y(p.v) / H })} onMouseLeave={() => setHover(null)}
                      onClick={() => setHover({ s, p, x: x(p.year) / W, y: y(p.v) / H })} />
                  </g>
                ))}
              </g>
            );
          })}
          {labels.map(({ s, last, ly }) => (
            <g key={s.id}>
              <line x1={x(last.year) + 8} x2={W - R + 14} y1={y(last.v)} y2={ly} className="leader" />
              <text x={W - R + 18} y={ly + 4} className="dlabel">
                {s.short} <tspan className="dval">{last.v.toLocaleString()}</tspan>
              </text>
            </g>
          ))}
          {inline.map(({ s, last }) => (
            <text key={s.id} x={x(last.year)} y={y(last.v) - 12} className="dlabel" textAnchor="middle">
              {s.short} <tspan className="dval">{last.v.toLocaleString()}</tspan>
            </text>
          ))}
        </svg>
        {hover && (
          <div className="trend-tip" style={{ left: `${hover.x * 100}%`, top: `${hover.y * 100}%` }}>
            <b><i style={{ background: `var(--series-${hover.s.slot})` }} />{hover.s.short} {hover.p.year}</b>
            <div>{hover.p.v.toLocaleString()} 人報名</div>
            <small>{hover.p.label}{hover.p.grade === "B" ? "・新聞數字" : ""}</small>
          </div>
        )}
      </div>
      <ul className="trend-notes hint">
        <li>台大 113 是資工系單獨招生；114 起資工與 AI 碩士班聯招，報名數含 AI。</li>
        <li>台師大 113 公布的是「資審合格人數」，114 起是報考人數。</li>
        <li>中興、中正以系為單位（甲乙組合計）；陽明交大是資訊聯招合計（含多個所）；成大 115 只有新聞數字。</li>
      </ul>
    </figure>
  );
}
