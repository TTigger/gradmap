// 把 data/*.yaml 轉成網站用的 src/generated/data.json，並產生 public/gradmap.ics
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { buildIcs } from "../shared/ics.mjs";

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
    if (p.review_only && !p.review_method) errors.push(`${s.id}: ${p.name} 設了 review_only，要寫 review_method（例："書審 100%"、"書審 50%＋口試 50%"）`);
    for (const g of p.groups ?? []) {
      g.papers ??= [];
      for (const paper of g.papers) {
        // 綜合科目（如「計算機概論」）可以不對應單一科目代碼；網站一律當成空陣列處理
        if (paper.covers != null && !Array.isArray(paper.covers)) errors.push(`${g.id}: ${paper.name} 的 covers 要是陣列`);
        paper.covers ??= [];
        for (const c of paper.covers) {
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

// 學校清單（含別名、資料來源）、歷年數據、備考情報
const registry = read("data/registry.yaml").schools;
const histDir = path.join(root, "data/history");
const history = fs.existsSync(histDir)
  ? fs.readdirSync(histDir).filter((f) => f.endsWith(".yaml")).map((f) => read(`data/history/${f}`))
  : [];
const resources = read("data/resources.yaml").resources ?? [];
const pastExams = read("data/past_exams.yaml");
const ids = new Set(registry.map((r) => r.id));
for (const s of schools) if (!ids.has(s.id)) errors.push(`registry 缺少 ${s.id}`);
for (const h of history) {
  if (!ids.has(h.school)) errors.push(`history: 未知學校 ${h.school}`);
  for (const r of h.records ?? []) {
    const sid = String(r.src).split(" ")[0];
    if (!h.sources?.[sid]) errors.push(`history ${h.school} ${r.year}: 來源 ${sid} 未定義`);
  }
}
for (const x of pastExams.schools) {
  if (!ids.has(x.school)) errors.push(`past_exams: 未知學校 ${x.school}`);
  if (!x.url || !x.access) errors.push(`past_exams ${x.school}: 缺少 url 或 access`);
}
for (const s of schools) {
  if (s.venue && (!s.venue.city || !s.venue.src)) errors.push(`${s.id} venue: 缺少 city 或 src`);
  if (s.waitlist_info && (!s.waitlist_info.how || !s.waitlist_info.src)) errors.push(`${s.id} waitlist_info: 缺少 how 或 src`);
}
for (const h of history) if (!h.published) errors.push(`history ${h.school}: 缺少 published（給使用者看的說明）`);
for (const s of schools) {
  for (const c of s.changes ?? []) {
    for (const k of ["date", "where", "what", "src"]) if (!c[k]) errors.push(`${s.id} changes: 缺少 ${k}`);
    if (c.where && !/^(schedule\.[a-z_]+|group:[\w-]+|fee|school)$/.test(c.where)) errors.push(`${s.id} changes: where 格式錯誤 ${c.where}`);
  }
}
for (const r of resources) {
  for (const k of ["title", "url", "grade", "kind", "publisher", "checked"]) if (!r[k]) errors.push(`resource「${r.title ?? "?"}」缺少 ${k}`);
  for (const s of r.schools ?? []) if (!ids.has(s)) errors.push(`resource「${r.title}」: 未知學校 ${s}`);
}
if (errors.length) {
  console.error("資料檢查失敗：\n" + errors.join("\n"));
  process.exit(1);
}

// 排程用的內部註記（todo、watch）不放進網站
for (const h of history) delete h.todo;
for (const r of registry) delete r.watch;
// 每日查核最近一次的時間與結果（排程寫入；還沒跑過就沒有）
const lastCheckPath = path.join(root, "data/last_check.yaml");
const lastCheck = fs.existsSync(lastCheckPath) ? yaml.load(fs.readFileSync(lastCheckPath, "utf8")) : null;
if (lastCheck && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(lastCheck.at ?? "")) { console.error("last_check.yaml: at 格式應為 YYYY-MM-DDTHH:MM"); process.exit(1); }
const updatesPath = path.join(root, "data/updates.yaml");
const updates = fs.existsSync(updatesPath) ? yaml.load(fs.readFileSync(updatesPath, "utf8")) ?? [] : [];
{
  const ids = new Set([...schools.map((s) => s.id), ...(pending.schools ?? []).map((s) => s.id)]);
  const bad = [];
  for (const u of updates) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(u.date ?? "")) bad.push(`updates.yaml: 日期格式應為 YYYY-MM-DD（${u.text}）`);
    if (!["new", "change", "info"].includes(u.kind)) bad.push(`updates.yaml: kind 只能是 new／change／info（${u.text}）`);
    if (!u.text) bad.push("updates.yaml: 有一筆沒有 text");
    for (const id of u.schools ?? []) if (!ids.has(id)) bad.push(`updates.yaml: 未知學校 ${id}`);
  }
  if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
  updates.sort((a, b) => b.date.localeCompare(a.date));
}
const out = { generated: new Date().toISOString(), lastCheck, updates, subjects, schools, pending, registry, history, resources, pastExams };
fs.mkdirSync(path.join(root, "src/generated"), { recursive: true });
fs.writeFileSync(path.join(root, "src/generated/data.json"), JSON.stringify(out, null, 2));

// ---------- .ics：全部學校一份，另外每校各一份（可以只訂閱想考的學校） ----------
fs.mkdirSync(path.join(root, "public/ics"), { recursive: true });
fs.writeFileSync(path.join(root, "public/gradmap.ics"), buildIcs(schools));
for (const s of schools.filter((x) => x.status === "verified")) {
  fs.writeFileSync(path.join(root, `public/ics/${s.id}.ics`), buildIcs([s], `上岸地圖・${s.short}`));
}

const nGroups = schools.reduce((a, s) => a + s.programs.reduce((b, p) => b + p.groups.length, 0), 0);
console.log(`資料：${schools.length} 校、${nGroups} 組；待公告 ${pending.schools.length} 校；ics 已產生`);
