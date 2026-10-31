// 把 data/*.yaml 轉成網站用的 src/generated/data.json，並產生 public/gradmap.ics
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const read = (p) => yaml.load(fs.readFileSync(path.join(root, p), "utf8"));

const subjects = read("data/subjects.yaml").subjects;
const pending = read("data/pending.yaml");
const schoolDir = path.join(root, "data/schools");
const schools = fs
  .readdirSync(schoolDir)
  .filter((f) => f.endsWith(".yaml"))
  .map((f) => read(`data/schools/${f}`));

// 基本檢查：缺欄位就讓建置失敗，避免網站顯示壞資料
const errors = [];
for (const s of schools) {
  for (const k of ["id", "name", "short", "status", "brochure", "schedule", "programs"]) {
    if (s[k] === undefined) errors.push(`${s.id ?? "?"}: 缺少 ${k}`);
  }
  for (const e of s.schedule ?? []) {
    if (!e.start && !e.end) errors.push(`${s.id}: 日程「${e.label}」沒有日期`);
    if (!e.src) errors.push(`${s.id}: 日程「${e.label}」沒有來源頁碼`);
  }
  for (const p of s.programs ?? []) {
    for (const g of p.groups ?? []) {
      for (const paper of g.papers ?? []) {
        for (const c of paper.covers ?? []) {
          if (!subjects[c]) errors.push(`${g.id}: 未知科目代碼 ${c}`);
        }
      }
    }
  }
}
if (errors.length) {
  console.error("資料檢查失敗：\n" + errors.join("\n"));
  process.exit(1);
}

// 把近親所清單（只有名稱、還沒整理考科）也轉成 program，方便網站一起列出
for (const s of schools) {
  for (const nk of s.near_kin ?? []) {
    s.programs.push({
      id: `${s.id}-nk-${nk.name}`,
      name: nk.name,
      kind: "near_kin",
      stub: true,
      groups: [{ id: `${s.id}-nk-${nk.name}-g`, name: "—", quota: nk.quota ? { general: nk.quota } : {}, papers: [], papers_note: nk.note }],
    });
  }
  delete s.near_kin;
}

const out = { generated: new Date().toISOString(), subjects, schools, pending };
fs.mkdirSync(path.join(root, "src/generated"), { recursive: true });
fs.writeFileSync(path.join(root, "src/generated/data.json"), JSON.stringify(out, null, 2));

// ---------- .ics ----------
const pad = (n) => String(n).padStart(2, "0");
const hasTime = (d) => d.includes("T");
const icsDateTime = (d) => d.replace(/[-:]/g, "") + "00"; // 2026-11-10T09:00 → 20261110T090000
const icsDate = (d) => d.slice(0, 10).replace(/-/g, "");
const nextDay = (d) => {
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, day + 1));
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}`;
};
const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";

const lines = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//GradMap//CS Grad Exams//ZH-TW",
  "CALSCALE:GREGORIAN",
  "X-WR-CALNAME:上岸地圖 GradMap",
  "X-WR-TIMEZONE:Asia/Taipei",
  "BEGIN:VTIMEZONE",
  "TZID:Asia/Taipei",
  "BEGIN:STANDARD",
  "DTSTART:19700101T000000",
  "TZOFFSETFROM:+0800",
  "TZOFFSETTO:+0800",
  "TZNAME:CST",
  "END:STANDARD",
  "END:VTIMEZONE",
];

function addEvent(uid, when, summary, desc, alarm) {
  lines.push("BEGIN:VEVENT", `UID:${uid}@gradmap`, `DTSTAMP:${stamp}`);
  if (hasTime(when)) {
    lines.push(`DTSTART;TZID=Asia/Taipei:${icsDateTime(when)}`, `DTEND;TZID=Asia/Taipei:${icsDateTime(when)}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${icsDate(when)}`, `DTEND;VALUE=DATE:${nextDay(when)}`);
  }
  lines.push(`SUMMARY:${esc(summary)}`, `DESCRIPTION:${esc(desc)}`);
  if (alarm) {
    lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(summary)}`, "TRIGGER:-P1D", "END:VALARM");
  }
  lines.push("END:VEVENT");
}

const DEADLINE_TYPES = new Set(["register", "payment", "upload", "enroll", "waitlist", "regrade"]);
for (const s of schools) {
  if (s.status !== "verified") continue; // 參考年度的日期不放進行事曆
  s.schedule.forEach((e, i) => {
    const desc = `${e.label}${e.note ? "\n" + e.note : ""}\n來源：${s.brochure.title} ${e.src}`;
    const isRange = e.start && e.end && e.start.slice(0, 10) !== e.end.slice(0, 10);
    if (isRange) {
      // 繳費、上傳通常和報名同一天開始，只放截止，避免行事曆太吵
      if (!["payment", "upload"].includes(e.type)) {
        addEvent(`${s.id}-${i}-start`, e.start, `【${s.short}】${e.label}開始`, desc, false);
      }
      addEvent(`${s.id}-${i}-end`, e.end, `【${s.short}】${e.label}截止`, desc, DEADLINE_TYPES.has(e.type));
    } else if (e.end && !e.start) {
      addEvent(`${s.id}-${i}-end`, e.end, `【${s.short}】${e.label}`, desc, true);
    } else {
      addEvent(`${s.id}-${i}`, e.start, `【${s.short}】${e.label}`, desc, e.type === "exam");
    }
  });
}
lines.push("END:VCALENDAR");
fs.mkdirSync(path.join(root, "public"), { recursive: true });
fs.writeFileSync(path.join(root, "public/gradmap.ics"), lines.join("\r\n") + "\r\n");

const nGroups = schools.reduce((a, s) => a + s.programs.reduce((b, p) => b + p.groups.length, 0), 0);
console.log(`資料：${schools.length} 校、${nGroups} 組；待公告 ${pending.schools.length} 校；ics 已產生`);
