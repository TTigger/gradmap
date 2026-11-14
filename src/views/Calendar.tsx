import { useEffect, useMemo, useState } from "react";
import type { Data } from "../types";
import { TYPE_META, fmtWhen, verifiedEvents, dayKey, fmtTime, phaseOk, changesAt, changeTip, type Phase, type Sel, srcLabel } from "../lib";

interface Chip { key: string; focus: string; text: string; color: string; tip: string; strong: boolean; changed: boolean }

interface Props { data: Data; now: Date; sel: Sel; phase: Phase; focusDate?: string; focusN: number }

export default function Calendar({ data, now, sel, phase, focusDate, focusN }: Props) {
  const byDay = useMemo(() => {
    const map = new Map<string, Chip[]>();
    const add = (day: string, c: Chip) => {
      const k = dayKey(day);
      map.set(k, [...(map.get(k) ?? []), c]);
    };
    verifiedEvents(data).forEach((e, i) => {
      if (!sel(e.school.id)) return;
      if (!phaseOk(phase, e.type)) return;
      const focus = `ev-${e.school.id}-${e.idx}`;
      const color = TYPE_META[e.type].color;
      const ch = changesAt(e.school, `schedule.${e.type}`, now);
      const changed = ch.length > 0;
      const tip = `${e.school.short}｜${e.label}\n${fmtWhen(e)}${e.note ? "\n" + e.note : ""}\n來源 ${srcLabel(e.src)}${changed ? "\n⚠️ " + changeTip(ch) : ""}`;
      const strong = e.type === "exam" || e.type === "result";
      const t = (s: string) => (fmtTime(s) && fmtTime(s) !== "00:00" ? ` ${fmtTime(s)}` : "");
      if (e.type === "exam" && e.start && e.end && dayKey(e.start) !== dayKey(e.end)) {
        // 連考好幾天：每個考試日都標出來（考試沒有「截止」）
        const [y, m, d] = dayKey(e.start).split("-").map(Number);
        for (let n = 0; n < 31; n++) {
          const t = new Date(Date.UTC(y, m - 1, d + n));
          const k = `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
          if (k > dayKey(e.end)) break;
          add(k, { key: `${i}d${n}`, focus: n ? `${focus}-d${n}` : `${focus}-s`, text: `${e.school.short} ${e.label}・第${n + 1}天`, color, tip, strong, changed });
        }
      } else if (e.start && e.end && dayKey(e.start) !== dayKey(e.end)) {
        if (!["payment", "upload"].includes(e.type)) add(e.start, { key: `${i}s`, focus: focus + "-s", text: `${e.school.short} ${e.label}開始`, color, tip, strong, changed });
        add(e.end, { key: `${i}e`, focus, text: `${e.school.short} ${e.label}截止${t(e.end)}`, color, tip, strong: true, changed });
      } else if (e.end && !e.start) {
        add(e.end, { key: `${i}`, focus, text: `${e.school.short} ${e.label}`, color, tip, strong: true, changed });
      } else if (e.start) {
        add(e.start, { key: `${i}`, focus, text: `${e.school.short} ${e.label}${t(e.start)}`, color, tip, strong, changed });
      }
    });
    return map;
  }, [data, sel, phase, now]);

  const [cursor, setCursor] = useState(() => {
    // 從「今天」與「第一筆事件」較晚的那個月開始
    const first = [...byDay.keys()].sort()[0];
    const base = first && new Date(first) > now ? new Date(first) : now;
    const f = focusDate ? new Date(focusDate.slice(0, 10) + "T00:00:00+08:00") : null;
    const b = f ?? base;
    return new Date(b.getFullYear(), b.getMonth(), 1);
  });

  // 從搜尋跳過來：切到那個月
  useEffect(() => {
    if (!focusDate) return;
    const f = new Date(focusDate.slice(0, 10) + "T00:00:00+08:00");
    setCursor(new Date(f.getFullYear(), f.getMonth(), 1));
  }, [focusDate, focusN]);

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
                  <span key={c.key} data-focus={c.focus} className={`chip ${c.strong ? "strong" : ""} ${c.changed ? "changed" : ""}`} title={c.tip}
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
          <div key={k} className={`cal-list-day ${k < todayKey ? "past" : ""} ${k === todayKey ? "today" : ""}`}>
            <b>{Number(k.slice(5, 7))}/{Number(k.slice(8, 10))}<small>（{"日一二三四五六"[new Date(k + "T00:00:00+08:00").getDay()]}）</small>{k === todayKey && <span className="cal-today">今天</span>}</b>
            <div>
              {chips.map((c) => (
                <span key={c.key} data-focus={c.focus} className={`chip ${c.strong ? "strong" : ""} ${c.changed ? "changed" : ""}`} title={c.tip} style={{ ["--chip" as string]: c.color }}>{c.text}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
