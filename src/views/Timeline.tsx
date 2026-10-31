import type { Data, School } from "../types";
import { TYPE_META, fmtWhen, toDate, fmtDay } from "../lib";

const DAY = 86400000;

export default function Timeline({ data, now }: { data: Data; now: Date }) {
  const schools = data.schools.filter((s) => s.status === "verified");
  if (!schools.length) return <p className="empty">還沒有已查證的學校。</p>;

  // 範圍：最早的報名開始 → 最晚的報到，前後各留幾天
  const all = schools.flatMap((s) => s.schedule.flatMap((e) => [e.start, e.end].filter(Boolean) as string[]));
  const times = all.map((s) => +toDate(s));
  const start = new Date(Math.min(...times, +now) - 5 * DAY);
  start.setDate(1);
  const endT = Math.max(...times.filter((t) => t < +start + 200 * DAY)) + 10 * DAY; // 7 月現場驗證這種遠期事件不撐開時間軸
  const span = endT - +start;
  const pos = (s: string) => ((+toDate(s) - +start) / span) * 100;

  const months: { label: string; left: number }[] = [];
  const m = new Date(start);
  while (+m < endT) {
    months.push({ label: `${m.getMonth() + 1}月`, left: ((+m - +start) / span) * 100 });
    m.setMonth(m.getMonth() + 1);
  }
  const todayLeft = ((+now - +start) / span) * 100;

  // 考試日期衝突與連續考試
  const examDays = schools
    .map((s) => ({ s, day: s.schedule.find((e) => e.type === "exam")?.start?.slice(0, 10) }))
    .filter((x): x is { s: School; day: string } => !!x.day)
    .sort((a, b) => a.day.localeCompare(b.day));
  const warnings: string[] = [];
  for (let i = 0; i < examDays.length; i++) {
    for (let j = i + 1; j < examDays.length; j++) {
      const diff = (+toDate(examDays[j].day) - +toDate(examDays[i].day)) / DAY;
      if (diff === 0) warnings.push(`⚠️ ${examDays[i].s.short}、${examDays[j].s.short} 同一天考試（${fmtDay(examDays[i].day)}）`);
      else if (diff === 1) warnings.push(`連續兩天考試：${examDays[i].s.short} ${fmtDay(examDays[i].day)} → ${examDays[j].s.short} ${fmtDay(examDays[j].day)}`);
    }
  }

  const sorted = [...schools].sort((a, b) => {
    const ea = a.schedule.find((e) => e.type === "exam")?.start ?? "";
    const eb = b.schedule.find((e) => e.type === "exam")?.start ?? "";
    return ea.localeCompare(eb);
  });

  return (
    <section className="card">
      <div className="legend">
        <span><i className="sw bar" style={{ background: TYPE_META.register.color }} />報名期間</span>
        <span><i className="sw diamond" style={{ background: TYPE_META.exam.color }} />考試</span>
        <span><i className="sw dot" style={{ background: TYPE_META.result.color }} />放榜</span>
        <span><i className="sw bar" style={{ background: TYPE_META.enroll.color }} />報到／備取</span>
      </div>

      <div className="tl" role="table" aria-label="各校時間軸">
        <div className="tl-head" role="row">
          <div className="tl-name" />
          <div className="tl-track">
            {months.map((mo) => (
              <span key={mo.label + mo.left} className="tl-month" style={{ left: `${mo.left}%` }}>{mo.label}</span>
            ))}
          </div>
        </div>
        {sorted.map((s) => (
          <div className="tl-row" role="row" key={s.id}>
            <div className="tl-name" role="rowheader">{s.short}</div>
            <div className="tl-track">
              {months.map((mo) => <span key={mo.left} className="tl-grid" style={{ left: `${mo.left}%` }} />)}
              {todayLeft >= 0 && todayLeft <= 100 && <span className="tl-today" style={{ left: `${todayLeft}%` }} />}
              {s === sorted[0] && todayLeft >= 0 && todayLeft <= 100 && (
                <span className="tl-today-label" style={{ left: `${todayLeft}%` }}>今天</span>
              )}
              {s.schedule.map((e, i) => {
                const meta = TYPE_META[e.type];
                const tip = `${s.short}｜${e.label}\n${fmtWhen(e)}${e.note ? "\n" + e.note : ""}\n來源 ${e.src}`;
                if (e.type === "register" && e.start && e.end) {
                  return (
                    <span key={i} className="tl-bar" title={tip}
                      style={{ left: `${pos(e.start)}%`, width: `${Math.max(pos(e.end) - pos(e.start), 0.6)}%`, background: meta.color }}>
                      <em>{fmtDay(e.start, false)}–{fmtDay(e.end, false)}</em>
                    </span>
                  );
                }
                if ((e.type === "enroll" || e.type === "waitlist") && (e.start || e.end)) {
                  const a = e.start ?? e.end!, b = e.end ?? e.start!;
                  if (+toDate(a) > endT) return null;
                  return (
                    <span key={i} className="tl-bar thin" title={tip}
                      style={{ left: `${pos(a)}%`, width: `${Math.max(pos(b) - pos(a), 0.6)}%`, background: meta.color }} />
                  );
                }
                if (e.type === "exam" && e.start) {
                  return (
                    <span key={i} className="tl-mark diamond" title={tip} style={{ left: `${pos(e.start)}%`, background: meta.color }}>
                      <em>{fmtDay(e.start, false)}</em>
                    </span>
                  );
                }
                if (e.type === "result" && e.start) {
                  return <span key={i} className="tl-mark dot" title={tip} style={{ left: `${pos(e.start)}%`, background: meta.color }} />;
                }
                return null;
              })}
            </div>
          </div>
        ))}
      </div>

      {warnings.length > 0 && (
        <ul className="warn">
          {warnings.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}

      <details className="detail-list">
        <summary>各校完整日程</summary>
        <div className="sched-grid">
          {sorted.map((s) => (
            <div key={s.id} className="sched">
              <h3>{s.name}</h3>
              <ul>
                {s.schedule.map((e, i) => (
                  <li key={i}>
                    <span className="tag" style={{ borderColor: TYPE_META[e.type].color, color: TYPE_META[e.type].color }}>{TYPE_META[e.type].label}</span>
                    <span className="when">{fmtWhen(e)}</span>
                    <span className="what">{e.label}{e.note && <small> · {e.note}</small>}</span>
                    <a className="src" href={s.brochure.url} target="_blank" rel="noreferrer" title={s.brochure.title}>{e.src}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
