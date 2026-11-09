// 自動核對：每個日程日期、名額、報名費是否真的出現在它所標的簡章頁面上。
// 用法：node scripts/verify-src.mjs   （需要先跑過 scripts/extract.sh 抽出 sources/<年>/text/<id>/pNNN.txt）
// 找不到的項目會列出來，交給人工打開 PDF 確認（可能是版面拆字，不一定是錯）。
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const dir = path.join(root, "data/schools");
let bad = 0, ok = 0, skipped = 0;
const weak = [];

const norm = (s) => s.replace(/\s+/g, "").replace(/臺/g, "台");
function page(sid, year, src) {
  const m = /^p(\d+)/.exec(String(src ?? "").trim());
  if (!m) return null;
  const f = path.join(root, `sources/${year}/text/${sid}/p${m[1].padStart(3, "0")}.txt`);
  return fs.existsSync(f) ? norm(fs.readFileSync(f, "utf8")) : null;
}
// 2027-01-26 → 民國 116 年 1 月 26 日的各種寫法
function dateForms(iso) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const roc = y - 1911;
  return [`${roc}年${m}月${d}日`, `${m}月${d}日`, `${roc}.${m}.${d}`, `${roc}/${m}/${d}`, `${m}/${d}`,
    `${roc}.${String(m).padStart(2, "0")}.${String(d).padStart(2, "0")}`, `${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}`,
    // 補零寫法（例：海大「116 年02 月01 日」）
    `${String(m).padStart(2, "0")}月${String(d).padStart(2, "0")}日`];
}
function check(label, text, forms) {
  if (text == null) { skipped++; return; }
  if (forms.some((f) => text.includes(norm(f)))) ok++;
  else { bad++; console.log(`  ✗ ${label}`); }
}

for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".yaml"))) {
  const s = yaml.load(fs.readFileSync(path.join(dir, f), "utf8"));
  // 尚未公告的學校用參考年度的簡章核對
  const yr = s.status === "verified" ? s.year : s.reference_year;
  if (!yr) continue;
  s.year = yr;
  console.log(`${s.short}（${s.id}，${yr} 簡章）`);
  for (const e of s.schedule) {
    const t = page(s.id, s.year, e.src);
    for (const d of [e.start, e.end].filter(Boolean)) check(`${e.label} ${d}（${e.src}）`, t, dateForms(d));
  }
  for (const p of s.programs) for (const g of p.groups) {
    const n = g.quota?.general;
    // 名額：數字前後不能接其他數字（避免 50 被 150 誤判）；個位數仍可能巧合，報告會提醒人工看
    if (n != null && g.quota_src) {
      const t = page(s.id, s.year, g.quota_src);
      if (t == null) skipped++;
      else if (new RegExp(`(^|[^\\d])${n}([^\\d]|$)`).test(t)) { ok++; if (n < 10) weak.push(`${g.id} 名額 ${n}（${g.quota_src}）`); }
      else { bad++; console.log(`  ✗ ${g.id} 名額 ${n}（${g.quota_src}）`); }
    }
    // 考科比例：寫在系所頁上（同 quota_src 那頁，或下一頁）
    for (const pp of g.papers ?? []) {
      if (pp.weight_pct == null || !g.quota_src) continue;
      const m = /^p(\d+)/.exec(g.quota_src);
      if (!m) { skipped++; continue; }
      const t = [0, 1].map((k) => page(s.id, s.year, `p${+m[1] + k}`) ?? "").join("");
      check(`${g.id} ${pp.name} ${pp.weight_pct}%`, t, [`${pp.weight_pct}%`, `${pp.weight_pct}％`]);
    }
  }
  if (s.fee?.src) check(`報名費 ${s.fee.amount}（${s.fee.src}）`, page(s.id, s.year, s.fee.src), [String(s.fee.amount), s.fee.amount.toLocaleString()]);
}
if (weak.length) console.log(`\n個位數名額請人工看一眼：\n  ${weak.join("\n  ")}`);
console.log(`\n通過 ${ok}、找不到 ${bad}、沒有對應文字檔 ${skipped}`);
process.exit(bad ? 1 : 0);
