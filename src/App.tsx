import Icon from "./Icon";
import { useEffect, useMemo, useRef, useState } from "react";
import raw from "./generated/data.json";
import type { Data } from "./types";
import type { TabId, Target } from "./search";
import SearchBox from "./SearchBox";
import MyList from "./MyList";
import IcsMenu from "./IcsMenu";
import History from "./views/History";
import PastExams from "./views/PastExams";
import After from "./views/After";
import PrepPlanner from "./views/PrepPlanner";
import Resources from "./views/Resources";
import { daysUntil, fmtDay, fmtDayW, fmtMD, fmtTime, makeSel, nextDeadlines, PHASES, recentChanges, type Phase } from "./lib";
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
  { id: "history", label: "歷年數據" },
  { id: "past", label: "考古題" },
  { id: "after", label: "放榜・遞補" },
  { id: "resources", label: "備考情報" },
  { id: "pending", label: "待公告" },
] as const satisfies readonly { id: TabId; label: string }[];


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
  const [school, setSchool] = useState<string>(() => load("gm.school", "all"));
  const [phase, setPhase] = useState<Phase>(() => load<Phase>("gm.phase", "all"));
  // 分享連結 ?mine=ntnu,ncu：換裝置或傳給朋友時帶著志願清單
  const shared = useMemo(() => {
    const q = new URLSearchParams(location.search).get("mine");
    if (q == null) return null;
    const ids = q.split(",").filter((id) => data.registry.some((r) => r.id === id));
    history.replaceState(null, "", location.pathname + location.hash);
    return ids;
  }, []);
  const [mine, setMine] = useState<string[]>(() => shared ?? load("gm.mine", []));
  const [mineOnly, setMineOnly] = useState<boolean>(() => (shared?.length ? true : load("gm.mineOnly", false)));
  const [focus, setFocus] = useState<{ id?: string; date?: string; n: number }>({ n: 0 });
  const now = useMemo(() => new Date(), []);
  // 上次來的時間：用來標出「你上次來之後」才出現的更正
  const [lastSeen] = useState<string>(() => load("gm.lastSeen", ""));
  useEffect(() => save("gm.lastSeen", now.toISOString().slice(0, 10)), [now]);
  useEffect(() => save("gm.mine", mine), [mine]);
  useEffect(() => save("gm.mineOnly", mineOnly), [mineOnly]);
  const sel = useMemo(() => makeSel(school, mine, mineOnly), [school, mine, mineOnly]);
  const changes = recentChanges(data, now);

  useEffect(() => save("gm.school", school), [school]);
  useEffect(() => save("gm.phase", phase), [phase]);

  // 搜尋結果：切分頁、必要時套用學校篩選，然後捲到該項目並閃一下
  const go = (t: Target) => {
    setTab(t.tab);
    if (t.school) setSchool(t.school);
    else if (t.focusId && school !== "all") setSchool("all"); // 避免目標被篩掉
    if (!t.school && t.focusId && mineOnly) setMineOnly(false);
    setFocus((f) => ({ id: t.focusId, date: t.date, n: f.n + 1 }));
  };
  useEffect(() => {
    if (!focus.id) return;
    const timer = setTimeout(() => {
      // 同一個 id 在桌機格子與手機清單各有一份，挑看得到的那個
      const els = [...document.querySelectorAll<HTMLElement>(`[data-focus="${focus.id}"]`)];
      const el = els.find((x) => x.offsetParent !== null) ?? els[0];
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.remove("flash");
      void el.offsetWidth;
      el.classList.add("flash");
    }, 60);
    return () => clearTimeout(timer);
  }, [focus]);

  const schoolOpts = data.registry;
  const schoolName = data.registry.find((r) => r.id === school)?.short;

  useEffect(() => {
    save("gm.tab", tab);
    history.replaceState(null, "", `#${tab}`);
  }, [tab]);
  useEffect(() => save("gm.nearKin", nearKin), [nearKin]);
  // 直接改網址的 #（例：分享 #compare 連結）也能切分頁
  useEffect(() => {
    const h = () => {
      const id = location.hash.slice(1) as TabId;
      if (TABS.some((t) => t.id === id)) setTab(id);
    };
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);

  const upcoming = nextDeadlines(data, now, 4, sel);
  const verified = data.schools.filter((s) => s.status === "verified").length;
  const tabsRef = useRef<HTMLDivElement>(null);
  const [tabFade, setTabFade] = useState({ l: false, r: false });
  const updFade = () => {
    const el = tabsRef.current;
    if (el) setTabFade({ l: el.scrollLeft > 4, r: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  };
  useEffect(() => {
    tabsRef.current?.querySelector<HTMLElement>(".tab.on")?.scrollIntoView({ block: "nearest", inline: "center" });
    updFade();
    window.addEventListener("resize", updFade);
    return () => window.removeEventListener("resize", updFade);
  }, [tab]);

  return (
    <>
    <nav className="lnav" aria-label="分頁">
      <div className="lnav-in">
        <span className="lnav-brand">上岸地圖 <span className="en">GradMap</span></span>
        <div className={`tabs-wrap ${tabFade.l ? "fade-l" : ""} ${tabFade.r ? "fade-r" : ""}`}>
          <div className="tabs" role="tablist" ref={tabsRef} onScroll={updFade}>
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={tab === t.id ? "tab on" : "tab"}
                onClick={() => { setTab(t.id); window.scrollTo({ top: 0 }); }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
    <div className="app">
      <header className="top">
        <div className="brand">
          <h1>上岸地圖 <span className="en">GradMap</span></h1>
          <p className="sub">資工所資訊儀表板 · 116 學年度考試入學</p>
          {data.lastCheck && (
            <p className="checked">
              <span className="checked-dot" aria-hidden="true" />
              每日自動查核・最近一次 {fmtDayW(data.lastCheck.at.slice(0, 10))} {data.lastCheck.at.slice(11)}・{data.lastCheck.result}
            </p>
          )}
        </div>
        <div className="stats">
          <span><b>{verified}</b> 校已查證</span>
          <span><b>{data.schools.length - verified + data.pending.schools.length}</b> 校待公告</span>
        </div>
      </header>

      {upcoming.length > 0 && (
        <section className="next" aria-label="接下來的截止日">
          {/* 手機上橫向滑動 */}
          {upcoming.map((u, i) => {
            const d = daysUntil(u.when, now);
            const iso = u.when.toISOString();
            return (
              <div key={i} className={`next-item ${i === 0 ? "first" : ""} ${u.kind}`}>
                <div className="next-days">
                  {d === 0 ? <b>今天</b> : <><b>{d}</b> 天</>}
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

      {data.updates.length > 0 && (
        <section className="updates" aria-label="最近更新">
          <b>最近更新</b>
          <ul>
            {data.updates.slice(0, 3).map((u, i) => <UpdateItem key={i} u={u} lastSeen={lastSeen} />)}
          </ul>
          {data.updates.length > 3 && (
            <details>
              <summary>全部更新紀錄（{data.updates.length}）</summary>
              <ul>{data.updates.slice(3).map((u, i) => <UpdateItem key={i} u={u} lastSeen={lastSeen} />)}</ul>
            </details>
          )}
        </section>
      )}

      {changes.length > 0 && (
        <section className="changes" aria-label="簡章更正">
          <b><Icon name="warn" /> 最近的簡章更正</b>
          <ul>
            {changes.map((c, i) => (
              <li key={i}>
                {lastSeen && c.date > lastSeen && <span className="badge new">新</span>}
                <span className="pill">{c.school.short}</span> {fmtDayW(c.date)}：{c.what}
                {c.before && <small>（原：{c.before}{c.after ? ` → ${c.after}` : ""}）</small>}
                <a href={c.school.brochure.url} target="_blank" rel="noreferrer" className="src"> 來源 {c.src}<Icon name="out" /></a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="finder">
        <SearchBox data={data} onPick={go} />
        <div className="filters">
          <MyList data={data} mine={mine} setMine={setMine} mineOnly={mineOnly} setMineOnly={setMineOnly} />
          <select value={school} onChange={(e) => setSchool(e.target.value)} aria-label="學校篩選" className={school !== "all" ? "on" : ""}>
            <option value="all">全部學校</option>
            {schoolOpts.map((r) => {
              const s = data.schools.find((x) => x.id === r.id);
              return <option key={r.id} value={r.id}>{r.short}{!s ? "（未公告）" : s.status === "pending" ? `（${s.reference_year} 參考）` : ""}</option>;
            })}
          </select>
          <select value={phase} onChange={(e) => setPhase(e.target.value as Phase)} aria-label="節點篩選" className={phase !== "all" ? "on" : ""}>
            {Object.entries(PHASES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {(school !== "all" || phase !== "all") && (
            <button className="chipbtn on" onClick={() => { setSchool("all"); setPhase("all"); }} title="清除篩選">
              {[schoolName, phase !== "all" && PHASES[phase].label].filter(Boolean).join("・")} <Icon name="close" />
            </button>
          )}
          <label className="toggle">
            <input type="checkbox" role="switch" checked={nearKin} onChange={(e) => setNearKin(e.target.checked)} />
            顯示近親所
          </label>
          <IcsMenu data={data} mine={mine} />
        </div>
      </div>

      <main>
        <h2 className="sr-only">{TABS.find((t) => t.id === tab)?.label}</h2>
        {mineOnly && mine.length > 0 && school === "all" && (
          <p className="scope-note"><Icon name="star" fill /> 只顯示我的志願：{data.registry.filter((r) => mine.includes(r.id)).map((r) => r.short).join("、")}
            <button className="linkbtn" onClick={() => setMineOnly(false)}>顯示全部</button></p>
        )}
        {tab === "timeline" && <Timeline data={data} now={now} school={school} sel={sel} phase={phase} />}
        {tab === "calendar" && <Calendar data={data} now={now} sel={sel} phase={phase} focusDate={focus.date} focusN={focus.n} />}
        {tab === "compare" && <Compare data={data} now={now} nearKin={nearKin} sel={sel} mine={mine} setMine={setMine} />}
        {tab === "matrix" && <><PrepPlanner data={data} nearKin={nearKin} sel={sel} go={go} /><Matrix data={data} nearKin={nearKin} sel={sel} /></>}
        {tab === "past" && <PastExams data={data} sel={sel} />}
        {tab === "after" && <After data={data} now={now} sel={sel} />}
        {tab === "history" && <History data={data} sel={sel} go={(id) => setFocus((f) => ({ id, n: f.n + 1 }))} />}
        {tab === "resources" && <Resources data={data} school={school} />}
        {tab === "pending" && <Pending data={data} />}
      </main>

      <footer className="foot">
        <p>
          每筆資料都附官方簡章頁碼（例：<code>p42 / 38</code> = PDF 第 42 頁／簡章印刷頁 38）。
        </p>
        <p><b>本站為個人整理、非官方網站，資料可能有誤，報名與應考請以各校簡章及公告為準。</b></p>
        <p>資料採 <a href="https://creativecommons.org/licenses/by-nc/4.0/deed.zh-hant" target="_blank" rel="noreferrer">CC BY-NC 4.0</a> 授權：非商業使用請標示出處「GradMap」，商業使用須事先同意。</p>
        <p>本站使用 Vercel 匿名流量統計（不使用 cookie、不追蹤個人），只用來了解網站使用情況。</p>
        <p>資料建置：{new Date(data.generated).toLocaleString("zh-TW", { hour12: false })}</p>
      </footer>
    </div>
    </>
  );
}

/** Date → "YYYY-MM-DDTHH:MM"（台灣時間），給格式化函式用 */
function toLocal(d: Date): string {
  const t = new Date(d.getTime() + 8 * 3600000);
  return t.toISOString().slice(0, 16);
}

function UpdateItem({ u, lastSeen }: { u: Data["updates"][number]; lastSeen: string }) {
  return (
    <li>
      <span className="u-date">{fmtMD(u.date)}</span>
      <span>{lastSeen && u.date > lastSeen && <span className="badge new">新</span>}{u.text}</span>
    </li>
  );
}
