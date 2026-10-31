import { useEffect, useMemo, useState } from "react";
import raw from "./generated/data.json";
import type { Data } from "./types";
import { daysUntil, fmtDay, fmtTime, nextDeadlines } from "./lib";
import Timeline from "./views/Timeline";
import Calendar from "./views/Calendar";
import Compare from "./views/Compare";
import Matrix from "./views/Matrix";
import Pending from "./views/Pending";

const data = raw as unknown as Data;

const TABS = [
  { id: "timeline", label: "時間軸" },
  { id: "calendar", label: "行事曆" },
  { id: "compare", label: "比較表" },
  { id: "matrix", label: "考科" },
  { id: "pending", label: "待公告" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}
function save(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* 無痕模式等情況存不了，略過 */
  }
}

export default function App() {
  const [tab, setTab] = useState<TabId>(() => {
    const h = location.hash.slice(1) as TabId;
    return TABS.some((t) => t.id === h) ? h : load<TabId>("gm.tab", "timeline");
  });
  const [nearKin, setNearKin] = useState<boolean>(() => load("gm.nearKin", true));
  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    save("gm.tab", tab);
    history.replaceState(null, "", `#${tab}`);
  }, [tab]);
  useEffect(() => save("gm.nearKin", nearKin), [nearKin]);

  const upcoming = nextDeadlines(data, now, 4);
  const verified = data.schools.filter((s) => s.status === "verified").length;

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <h1>上岸地圖 <span className="en">GradMap</span></h1>
          <p className="sub">資工所資訊儀表板 · 116 學年度考試入學</p>
        </div>
        <div className="stats">
          <span><b>{verified}</b> 校已查證</span>
          <span><b>{data.schools.length - verified + data.pending.schools.length}</b> 校待公告</span>
        </div>
      </header>

      {upcoming.length > 0 && (
        <section className="next" aria-label="接下來的截止日">
          {upcoming.map((u, i) => {
            const d = daysUntil(u.when, now);
            const iso = u.when.toISOString();
            return (
              <div key={i} className={`next-item ${i === 0 ? "first" : ""} ${u.kind}`}>
                <div className="next-days">
                  {d === 0 ? "今天" : <><b>{d}</b> 天</>}
                </div>
                <div className="next-text">
                  <span className="pill">{u.school.short}</span> {u.text}
                  <div className="next-date">
                    {fmtDay(toLocal(u.when))}
                    {fmtTime(toLocal(u.when)) !== "00:00" && ` ${fmtTime(toLocal(u.when))}`}
                  </div>
                </div>
                <time dateTime={iso} hidden />
              </div>
            );
          })}
        </section>
      )}

      <nav className="toolbar">
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? "tab on" : "tab"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="tools">
          <label className="toggle">
            <input type="checkbox" checked={nearKin} onChange={(e) => setNearKin(e.target.checked)} />
            顯示近親所
          </label>
          <a className="btn" href="/gradmap.ics" download>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M7 2v3M17 2v3M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
            訂閱行事曆
          </a>
        </div>
      </nav>

      <main>
        {tab === "timeline" && <Timeline data={data} now={now} />}
        {tab === "calendar" && <Calendar data={data} now={now} />}
        {tab === "compare" && <Compare data={data} nearKin={nearKin} />}
        {tab === "matrix" && <Matrix data={data} nearKin={nearKin} />}
        {tab === "pending" && <Pending data={data} />}
      </main>

      <footer className="foot">
        <p>
          每筆資料都附官方簡章頁碼（例：<code>p42 / 38</code> = PDF 第 42 頁／簡章印刷頁 38）。
          資料以各校最新公告為準。
        </p>
        <p>資料建置：{new Date(data.generated).toLocaleString("zh-TW", { hour12: false })}</p>
      </footer>
    </div>
  );
}

/** Date → "YYYY-MM-DDTHH:MM"（台灣時間），給格式化函式用 */
function toLocal(d: Date): string {
  const t = new Date(d.getTime() + 8 * 3600000);
  return t.toISOString().slice(0, 16);
}
