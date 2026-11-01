// 產生 .ics 行事曆。建置時（scripts/build-data.mjs）和網站上「我的志願」下載共用同一份程式。
const pad = (n) => String(n).padStart(2, "0");
const hasTime = (d) => d.includes("T");
const icsDateTime = (d) => d.replace(/[-:]/g, "") + "00"; // 2026-11-10T09:00 → 20261110T090000
const icsDate = (d) => d.slice(0, 10).replace(/-/g, "");
const nextDay = (d) => {
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, day + 1));
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}`;
};
const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const DEADLINE_TYPES = new Set(["register", "payment", "upload", "enroll", "waitlist", "regrade"]);

/** schools：已查證的學校（School[]）；name：行事曆名稱 */
export function buildIcs(schools, name = "上岸地圖 GradMap") {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//GradMap//CS Grad Exams//ZH-TW", "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${esc(name)}`, "X-WR-TIMEZONE:Asia/Taipei",
    "BEGIN:VTIMEZONE", "TZID:Asia/Taipei", "BEGIN:STANDARD", "DTSTART:19700101T000000",
    "TZOFFSETFROM:+0800", "TZOFFSETTO:+0800", "TZNAME:CST", "END:STANDARD", "END:VTIMEZONE",
  ];
  const add = (uid, when, summary, desc, alarm) => {
    lines.push("BEGIN:VEVENT", `UID:${uid}@gradmap`, `DTSTAMP:${stamp}`);
    if (hasTime(when)) lines.push(`DTSTART;TZID=Asia/Taipei:${icsDateTime(when)}`, `DTEND;TZID=Asia/Taipei:${icsDateTime(when)}`);
    else lines.push(`DTSTART;VALUE=DATE:${icsDate(when)}`, `DTEND;VALUE=DATE:${nextDay(when)}`);
    lines.push(`SUMMARY:${esc(summary)}`, `DESCRIPTION:${esc(desc)}`);
    if (alarm) lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(summary)}`, "TRIGGER:-P1D", "END:VALARM");
    lines.push("END:VEVENT");
  };
  for (const s of schools) {
    if (s.status !== "verified") continue; // 參考年度的日期不放進行事曆
    s.schedule.forEach((e, i) => {
      const desc = `${e.label}${e.note ? "\n" + e.note : ""}\n來源：${s.brochure.title} ${e.src}`;
      const isRange = e.start && e.end && e.start.slice(0, 10) !== e.end.slice(0, 10);
      if (isRange) {
        // 繳費、上傳通常和報名同一天開始，只放截止，避免行事曆太吵
        if (!["payment", "upload"].includes(e.type)) add(`${s.id}-${i}-start`, e.start, `【${s.short}】${e.label}開始`, desc, false);
        add(`${s.id}-${i}-end`, e.end, `【${s.short}】${e.label}截止`, desc, DEADLINE_TYPES.has(e.type));
      } else if (e.end && !e.start) {
        add(`${s.id}-${i}-end`, e.end, `【${s.short}】${e.label}`, desc, true);
      } else {
        add(`${s.id}-${i}`, e.start, `【${s.short}】${e.label}`, desc, e.type === "exam");
      }
    });
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
