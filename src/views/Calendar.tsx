import { useMemo, useState } from "react";
import type { Data } from "../types";
import { TYPE_META, fmtWhen, verifiedEvents, dayKey, fmtTime } from "../lib";

interface Chip { key: string; text: string; color: string; tip: string; strong: boolean }

export default function Calendar({ data, now }: { data: Data; now: Date }) {
  const byDay = useMemo(() => {
    const map = new Map<string, Chip[]>();
    const add = (day: string, c: Chip) => {
      const k = dayKey(day);
      map.set(k, [...(map.get(k) ?? []), c]);
    };
    verifiedEvents(data).forEach((e, i) => {
      const color = TYPE_META[e.type].color;
      const tip = `${e.school.short}｜${e.label}\n${fmtWhen(e)}${e.note ? "\n" + e.note : ""}\n來源 ${e.src}`;
      const strong = e.type === "exam" || e.type === "result";
      const t = (s: string) => (fmtTime(s) && fmtTime(s) !== "00:00" ? ` ${fmtTime(s)}` : "");
      if (e.start && e.end && dayKey(e.start) !== dayKey(e.end)) {
        if (!["payment", "upload"].includes(e.type)) add(e.start, { key: `${i}s`, text: `${e.school.short} ${e.label}開始`, color, tip, strong });
        add(e.end, { key: `${i}e`, text: `${e.school.short} ${e.label}截止${t(e.end)}`, color, tip, strong: true });
      } else if (e.end && !e.start) {
        add(e.end, { key: `${i}`, text: `${e.school.short} ${e.label}`, color, tip, strong: true });
      } else if (e.start) {
        add(e.start, { key: `${i}`, text: `${e.school.short} ${e.label}${t(e.start)}`, color, tip, strong });
      }
    });
    return map;
  }, [data]);

  const [cursor, setCursor] = useState(() => {
    // 從「今天」與「第一筆事件」較晚的那個月開始
    const first = [...byDay.keys()].sort()[0];
    const base = first && new Date(first) > now ? new Date(first) : now;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const y = cursor.getFullYear(), m = cursor.getMonth();
  const firstDow = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const key = (d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  // 本月清單（手機上格子太小時看這個）
  const monthList = [...byDay.entries()]
    .filter(([k]) => k.startsWith(`${y}-${String(m + 1).padStart(2, "0")}`))
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <section className="card">
      <div className="cal-nav">
        <button className="btn ghost" onClick={() => setCursor(new Date(y, m - 1, 1))} aria-label="上個月">‹</button>
        <h2>{y} 年 {m + 1} 月</h2>
        <button className="btn ghost" onClick={() => setCursor(new Date(y, m + 1, 1))} aria-label="下個月">›</button>
      </div>
      <div className="cal">
        {"日一二三四五六".split("").map((w) => <div key={w} className="cal-dow">{w}</div>)}
        {cells.map((d, i) => (
          <div key={i} className={`cal-cell ${d == null ? "blank" : ""} ${d != null && key(d) === todayKey ? "today" : ""}`}>
            {d != null && (
              <>
                <span className="cal-d">{d}</span>
                {(byDay.get(key(d)) ?? []).map((c) => (
                  <span key={c.key} className={`chip ${c.strong ? "strong" : ""}`} title={c.tip}
                    style={{ ["--chip" as string]: c.color }}>{c.text}</span>
                ))}
              </>
            )}
          </div>
        ))}
      </div>

      <div className="cal-list">
        {monthList.length === 0 && <p className="empty">這個月沒有事件。</p>}
        {monthList.map(([k, chips]) => (
          <div key={k} className="cal-list-day">
            <b>{Number(k.slice(5, 7))}/{Number(k.slice(8, 10))}</b>
            <div>
              {chips.map((c) => (
                <span key={c.key} className={`chip ${c.strong ? "strong" : ""}`} title={c.tip} style={{ ["--chip" as string]: c.color }}>{c.text}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
