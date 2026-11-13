// 上線前的網頁冒煙測試：用本機 Chrome 無頭模式打開建置好的網站（dist/）每一個分頁，
// 有 JavaScript 錯誤或畫面是空的就失敗（exit 1）。
// 用法：npm run build && node scripts/smoke.mjs
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const TABS = ["timeline", "calendar", "compare", "matrix", "history", "past", "after", "resources", "pending"];
const FAKE_DATES = ["2026-12-20T10:00:00+08:00", "2027-01-30T09:00:00+08:00", "2027-03-20T10:00:00+08:00", "2027-08-01T10:00:00+08:00"];
const PORT = 4300 + Math.floor(Math.random() * 500);
const DEBUG = PORT + 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
const profile = mkdtempSync(join(tmpdir(), "gm-smoke-"));
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${DEBUG}`, "--no-first-run", `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
const cleanup = () => { try { chrome.kill(); } catch {} try { server.kill(); } catch {} try { rmSync(profile, { recursive: true, force: true }); } catch {} };

// 404 頁的分頁連結要和網站分頁（src/App.tsx 的 TABS）一致：分頁改名或增減時別忘了 public/404.html
function check404() {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const page = readFileSync(new URL("../public/404.html", import.meta.url), "utf8");
  const want = [...app.matchAll(/\{ id: "(\w+)", label: "([^"]+)" \}/g)].map((m) => `${m[1]}=${m[2]}`).join(" ");
  const got = [...page.matchAll(/<a href="\/#(\w+)">([^<]+)<\/a>/g)].map((m) => `${m[1]}=${m[2]}`).join(" ");
  if (!want) throw new Error("讀不到 src/App.tsx 的分頁清單");
  if (want !== got) throw new Error(`404 頁的分頁連結和網站不一致\n  網站：${want}\n  404：${got}`);
  console.log("OK   404 頁分頁連結");
}

async function main() {
  check404();
  // 等網站與 Chrome 都起來
  for (let i = 0; i < 60; i++) { try { await fetch(`http://localhost:${PORT}/`); break; } catch { await sleep(250); } }
  let targets;
  for (let i = 0; i < 60; i++) { try { targets = await (await fetch(`http://127.0.0.1:${DEBUG}/json/list`)).json(); break; } catch { await sleep(250); } }
  if (!targets) throw new Error("Chrome 沒有啟動");

  const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let id = 0; const pending = new Map(); let errors = [];
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description?.split("\n")[0] ?? m.params.exceptionDetails.text);
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Runtime.enable"); await send("Page.enable");

  const failed = [];
  for (const tab of TABS) {
    errors = [];
    await send("Page.navigate", { url: `http://localhost:${PORT}/?smoke=${Date.now()}#${tab}` });
    await sleep(1500);
    const r = await send("Runtime.evaluate", { expression: "document.getElementById('root')?.innerText.trim().length ?? 0", returnByValue: true });
    const len = r.result?.result?.value ?? 0;
    const ok = errors.length === 0 && len > 200;
    console.log(`${ok ? "OK  " : "FAIL"} #${tab}  ${len} 字${errors.length ? "  錯誤：" + errors.join(" | ") : ""}`);
    if (!ok) failed.push(tab);
  }
  // 換成考季其他時間點再開一次每個分頁（報名後、考試當天、放榜報到期、全部結束後），抓只有特定日期才會出現的錯誤
  for (const when of FAKE_DATES) {
    const fake = `(() => { const R = Date, off = R.parse(${JSON.stringify(when)}) - R.now(); class D extends R { constructor(...a) { a.length ? super(...a) : super(R.now() + off); } static now() { return R.now() + off; } } window.Date = D; })()`;
    const { result } = await send("Page.addScriptToEvaluateOnNewDocument", { source: fake });
    const bad = [];
    for (const tab of TABS) {
      errors = [];
      await send("Page.navigate", { url: `http://localhost:${PORT}/?smoke=${Date.now()}#${tab}` });
      await sleep(900);
      const r = await send("Runtime.evaluate", { expression: "document.getElementById('root')?.innerText.trim().length ?? 0", returnByValue: true });
      const len = r.result?.result?.value ?? 0;
      const today = (await send("Runtime.evaluate", { expression: "new Date().toISOString().slice(0, 10)", returnByValue: true })).result?.result?.value;
      if (today !== when.slice(0, 10)) bad.push(`#${tab}（假日期沒有生效：${today}）`);
      if (errors.length || len <= 200) bad.push(`#${tab}（${len} 字${errors.length ? "，錯誤：" + errors.join(" | ") : ""}）`);
    }
    await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: result.identifier });
    console.log(`${bad.length ? "FAIL" : "OK  "} 假設今天是 ${when.slice(0, 10)}：${bad.length ? bad.join("、") : `${TABS.length} 個分頁都正常`}`);
    if (bad.length) failed.push(when.slice(0, 10));
  }
  ws.close();
  if (failed.length) { console.error(`網頁測試失敗：${failed.join(", ")}`); return 1; }
  console.log("網頁測試通過");
  return 0;
}

let code = 1;
try { code = await main(); } catch (e) { console.error("網頁測試無法執行：" + e.message); }
cleanup();
process.exit(code);
