import Icon from "../Icon";
import type { Data, School } from "../types";
import { TYPE_META, fmtWhen, toDate, type Sel, srcLabel } from "../lib";
import { useCopyLink, linkVerb } from "../useCopyLink";

const TYPES = ["result", "regrade", "enroll", "waitlist"] as const;

/** 放榜後：各校放榜、報到、備取遞補的日期與規則 */
export default function After({ data, now, sel }: { data: Data; now: Date; sel: Sel }) {
  const [copied, copyLink] = useCopyLink("after");
  const schools = data.schools.filter((s) => sel(s.id));
  const first = (s: School) => s.schedule.find((e) => e.type === "result")?.start ?? "9999";
  const sorted = [...schools].sort((a, b) =>
    a.status !== b.status ? (a.status === "verified" ? -1 : 1) : first(a).localeCompare(first(b)));
  const missing = data.registry.filter((r) => sel(r.id) && !data.schools.some((s) => s.id === r.id));
  return (
    <section className="card">
      <p className="lead">
        放榜後最容易漏掉的是<b>「備取生也要登記意願／寄回表格」</b>，沒做就視同放棄。下面是各校放榜、報到、遞補的日期和規則，
        每一項都附簡章頁碼。遞補公告通常放在系所網頁，3–4 月要常去看。
      </p>
      <div className="after-grid">
        {sorted.map((s) => {
          const ref = s.status === "pending";
          const evs = s.schedule.filter((e) => (TYPES as readonly string[]).includes(e.type));
          const w = s.waitlist_info;
          return (
            <article key={s.id} className={`after ${ref ? "ref" : ""}`} data-focus={`af-${s.id}`}>
              <h3>
                {s.name}
                <button className="lnk" title={`${linkVerb}這所學校放榜・遞補資訊的連結`} aria-label={`${linkVerb}${s.short}放榜與遞補資訊的連結`}
                  onClick={() => copyLink(`af-${s.id}`, `${s.short} 放榜・遞補｜上岸地圖`)}>{copied === `af-${s.id}` ? <span className="lnk-ok">已複製</span> : <Icon name="link" />}</button>
                {ref && <span className="badge ref">{s.reference_year} 參考</span>}
              </h3>
              {w?.alert && <p className="after-alert"><Icon name="warn" /> {w.alert}</p>}
              <ul className="after-ev">
                {evs.map((e, i) => {
                  const past = +toDate(e.end ?? e.start!) < +now;
                  return (
                    <li key={i} className={past ? "past" : ""}>
                      <span className="tag" style={{ borderColor: TYPE_META[e.type].color, color: TYPE_META[e.type].color }}>{TYPE_META[e.type].label}</span>
                      <span className="when">{fmtWhen(e)}</span>
                      <span className="what">{e.label}{e.note && <small> · {e.note}</small>}</span>
                    </li>
                  );
                })}
              </ul>
              {w ? (
                <div className="after-how">
                  <p>{w.how}</p>
                  {w.deadline && <p className="hint">遞補截止：{w.deadline}</p>}
                  {w.where && <a href={w.where.url} target="_blank" rel="noreferrer">{w.where.label}<Icon name="out" /></a>}
                  <span className="hint"> · 簡章 {srcLabel(w.src)}</span>
                </div>
              ) : (
                <p className="hint">{ref ? "116 簡章公告後補上遞補規則。" : "簡章沒有另外寫遞補方式，請看系所網頁。"}</p>
              )}
            </article>
          );
        })}
      </div>
      {missing.length > 0 && (
        <p className="hint">還沒公告簡章的學校：{missing.map((r) => r.short).join("、")}。公告後會補上。</p>
      )}
    </section>
  );
}
