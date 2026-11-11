import Icon from "../Icon";
import type { Data, School } from "../types";
import { TYPE_META, fmtWhen, toDate, fmtDay, fmtDayW, fmtMD, phaseOk, changesAt, changeTip, type Phase, type Sel, srcLabel } from "../lib";

const DAY = 86400000;

export default function Timeline({ data, now, school, sel, phase }: { data: Data; now: Date; school: string; sel: Sel; phase: Phase }) {
  const allVerified = data.schools.filter((s) => s.status === "verified");
  const schools = allVerified.filter((s) => sel(s.id));
  if (!schools.length)
    return (
      <section className="card">
        <p className="empty">
          {school === "all" ? "選取的學校 116 簡章都還沒公告，時間軸只放已查證的日期。可以到「比較表」看參考年度的資料，或到「各校簡章」看預計公告時間。" : "這所學校的 116 簡章還沒查證，時間軸只放已查證的日期。可以到「比較表」看參考年度的資料。"}
        </p>
      </section>
    );
  const show = (t: string) => phaseOk(phase, t);

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
  const examDays = allVerified
    .map((s) => ({ s, day: s.schedule.find((e) => e.type === "exam")?.start?.slice(0, 10) }))
    .filter((x): x is { s: School; day: string } => !!x.day)
    .sort((a, b) => a.day.localeCompare(b.day));
  // 同一天＝只能選一間（一定顯示）；連續兩天＝提醒考區（多的時候收起來）
  const sameDay: string[] = [];
  const nextDay: string[] = [];
  for (let i = 0; i < examDays.length; i++) {
    for (let j = i + 1; j < examDays.length; j++) {
      if (school !== "all" ? examDays[i].s.id !== school && examDays[j].s.id !== school : !(sel(examDays[i].s.id) && sel(examDays[j].s.id))) continue;
      const diff = (+toDate(examDays[j].day) - +toDate(examDays[i].day)) / DAY;
      const a = examDays[i].s, b = examDays[j].s;
      if (diff === 0) sameDay.push(`${a.short}、${b.short} 同一天考試（${fmtDay(examDays[i].day)}），只能選一間`);
      else if (diff === 1) {
        const ca = a.venue?.city, cb = b.venue?.city;
        let tip = "";
        if (b.venue?.choose) tip = `；${b.short}報名時可選考區（${cb}），可以選離前一天考場近的`;
        else if (a.venue?.choose) tip = `；${a.short}報名時可選考區（${ca}）`;
        else if (ca && cb && ca !== cb) tip = `；兩地不同城市，建議前一晚就到${cb}`;
        nextDay.push(`${a.short}${ca ? `（${ca}）` : ""} ${fmtDay(examDays[i].day)} → ${b.short}${cb ? `（${cb}）` : ""} ${fmtDay(examDays[j].day)}${tip}`);
      }
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

      <p className="tl-swipe" aria-hidden="true">往右滑，看考試、放榜和報到 →</p>
      <div className="tl" role="table" aria-label="各校時間軸">
        <div className="tl-head" role="row">
          <div className="tl-name" role="columnheader"><span className="sr-only">學校</span></div>
          <div className="tl-track" role="columnheader" aria-label="月份">
            {months.map((mo) => (
              <span key={mo.label + mo.left} className="tl-month" style={{ left: `${mo.left}%` }}>{mo.label}</span>
            ))}
          </div>
        </div>
        {sorted.map((s) => (
          <div className="tl-row" role="row" key={s.id} data-focus={`tl-${s.id}`}>
            <div className="tl-name" role="rowheader">{s.short}</div>
            <div className="tl-track" role="cell">
              {months.map((mo) => <span key={mo.left} className="tl-grid" style={{ left: `${mo.left}%` }} />)}
              {todayLeft >= 0 && todayLeft <= 100 && <span className="tl-today" style={{ left: `${todayLeft}%` }} />}
              {s === sorted[0] && todayLeft >= 0 && todayLeft <= 100 && (
                <span className="tl-today-label" style={{ left: `${todayLeft}%` }}>今天 {fmtDayW(toLocalDay(now))}</span>
              )}
              {s.schedule.map((e, i) => {
                if (!show(e.type)) return null;
                const meta = TYPE_META[e.type];
                const ch = changesAt(s, `schedule.${e.type}`, now);
                const tip = `${s.short}｜${e.label}\n${fmtWhen(e)}${e.note ? "\n" + e.note : ""}\n來源 ${srcLabel(e.src)}${ch.length ? "\n⚠️ " + changeTip(ch) : ""}`;
                const cc = ch.length ? " changed" : "";
                if (e.type === "register" && e.start && e.end) {
                  return (
                    <span key={i} className={"tl-bar" + cc} title={tip}
                      style={{ left: `${pos(e.start)}%`, width: `${Math.max(pos(e.end) - pos(e.start), 0.6)}%`, background: meta.color }}>
                      <em>{fmtDayW(e.start)}–{fmtDayW(e.end)}</em>
                    </span>
                  );
                }
                if ((e.type === "enroll" || e.type === "waitlist") && (e.start || e.end)) {
                  const a = e.start ?? e.end!, b = e.end ?? e.start!;
                  if (+toDate(a) > endT) return null;
                  return (
                    <span key={i} className={"tl-bar thin" + cc} title={tip}
                      style={{ left: `${pos(a)}%`, width: `${Math.max(pos(b) - pos(a), 0.6)}%`, background: meta.color }} />
                  );
                }
                if (e.type === "exam" && e.start) {
                  return (
                    <span key={i} className={"tl-mark diamond" + cc} title={tip} style={{ left: `${pos(e.start)}%`, background: meta.color }}>
                      <em>{fmtDayW(e.start)}</em>
                    </span>
                  );
                }
                if (e.type === "result" && e.start) {
                  return (
                    <span key={i} className={"tl-mark dot" + cc} title={tip} style={{ left: `${pos(e.start)}%`, background: meta.color }}>
                      <em>{fmtDayW(e.start)}</em>
                    </span>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}
      </div>

      {sameDay.length + nextDay.length > 0 && (
        <div className="warn">
          {sameDay.length > 0 && (
            <ul>{sameDay.map((w) => <li key={w}><Icon name="warn" /> {w}</li>)}</ul>
          )}
          {nextDay.length > 0 && (
            <details open={nextDay.length <= 3}>
              <summary>連續兩天考試 {nextDay.length} 組（看考區建議）</summary>
              <ul>{nextDay.map((w) => <li key={w}>{w}</li>)}</ul>
            </details>
          )}
        </div>
      )}

      {examDays.filter((x) => sel(x.s.id)).length > 0 && (
        <div className="trip">
          <h3 className="sec-h">考試行程與考場</h3>
          <div className="table-wrap">
          <table className="trip-t freeze">
            <tbody>
              {examDays.filter((x) => sel(x.s.id)).map((x, i, arr) => {
                const gap = i ? (+toDate(x.day) - +toDate(arr[i - 1].day)) / DAY : null;
                return (
                  <tr key={x.s.id}>
                    <td className="nowrap"><b>{fmtDayW(x.day)}</b>{gap != null && <div className="hint">{gap === 0 ? "和上一場同一天" : gap === 1 ? "上一場的隔天" : `距上一場 ${gap} 天`}</div>}</td>
                    <td className="nowrap"><b>{x.s.short}</b></td>
                    <td>
                      {x.s.venue ? <><b>{x.s.venue.city}</b>　{x.s.venue.place}<span className="hint"> · 簡章 {srcLabel(x.s.venue.src)}</span></> : <span className="hint">考場待公告</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          <p className="hint">只列 116 已查證的學校。確切試場多半在考前幾天公告、印在准考證上。</p>
        </div>
      )}

      <details className="detail-list">
        <summary>各校完整日程</summary>
        <div className="sched-grid">
          {sorted.map((s) => (
            <div key={s.id} className="sched">
              <h3>{s.name} <small className="verified"><a href={s.brochure.url} target="_blank" rel="noreferrer" title={s.brochure.title}>{s.status === "pending" ? `${s.reference_year} 簡章` : "簡章"}<Icon name="out" /></a>・查證 {fmtMD(s.brochure.verified)}</small></h3>
              <ul>
                {s.schedule.map((e, i) => show(e.type) && (
                  <li key={i} className={changesAt(s, `schedule.${e.type}`, now).length ? "changed" : ""} title={changeTip(changesAt(s, `schedule.${e.type}`, now)) || undefined}>
                    <span className="tag" style={{ borderColor: TYPE_META[e.type].color, color: TYPE_META[e.type].color }}>{TYPE_META[e.type].label}</span>
                    <span className="when">{fmtWhen(e)}</span>
                    <span className="what">{e.label}{e.note && <small> · {e.note}</small>}</span>
                    <a className="src" href={s.brochure.url} target="_blank" rel="noreferrer" title={s.brochure.title}>{srcLabel(e.src)}</a>
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

function toLocalDay(d: Date): string {
  return new Date(d.getTime() + 8 * 3600000).toISOString().slice(0, 10);
}
