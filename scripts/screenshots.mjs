// README 截圖：用本機 Chrome 無頭模式拍淺色／深色兩版，存到 docs/images/。
// 用法：npm run build && npx vite preview --port 4173 --strictPort（另開一個終端機）
//       node scripts/screenshots.mjs        → 再用 pngquant 壓縮（有裝的話自動做）
import { spawn, execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const OUT = process.argv[2] ?? "docs/images";
const BASE = "http://localhost:4173/";
const shots = [
  // name, hash, width, dark, clip: {sel} element rect, or {top,height} page px
  { name: "hero", hash: "timeline", w: 1280, clip: { top: 0, height: 1090 } },
  { name: "compare", hash: "compare", w: 1280, clip: { sel: "main section.card, main .card", height: 560 } },
  { name: "planner", hash: "matrix", w: 1280, clip: { sel: "section.pp" } },
  { name: "mobile", hash: "compare", w: 390, mobile: true, clip: { sel: "table.cmp", height: 780 } },
];

const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ["--headless=new", "--remote-debugging-port=9333", "--hide-scrollbars", "--no-first-run",
   `--user-data-dir=${mkdtempSync(join(tmpdir(), "gm-"))}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 40; i++) {
  try { targets = await (await fetch("http://127.0.0.1:9333/json/list")).json(); break; } catch { await sleep(250); }
}
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); })
  .then((m) => { if (m.error) throw new Error(method + ": " + m.error.message); return m.result; });
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true })).result.value;

for (const s of shots) {
  for (const dark of [false, true]) {
    await send("Emulation.setDeviceMetricsOverride", { width: s.w, height: s.mobile ? 844 : 900, deviceScaleFactor: 2, mobile: !!s.mobile });
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: dark ? "dark" : "light" }] });
    await send("Page.navigate", { url: BASE + "?shot=" + Date.now() + "#" + s.hash });
    await sleep(2500);
    let clip;
    if (s.clip.sel) {
      const r = await evaluate(`(() => { const e = document.querySelector(${JSON.stringify(s.clip.sel)}); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, w: b.width, h: b.height }; })()`);
      if (!r) throw new Error("no element for " + s.name);
      const pad = 16;
      clip = { x: r.x - pad, y: r.y - pad, width: r.w + pad * 2, height: Math.min(r.h, s.clip.height ?? 1e9) + pad * 2, scale: 1 };
    } else {
      clip = { x: 0, y: s.clip.top, width: s.w, height: s.clip.height, scale: 1 };
    }
    const { data } = await send("Page.captureScreenshot", { format: "png", clip, captureBeyondViewport: true });
    const f = join(OUT, `${s.name}-${dark ? "dark" : "light"}.png`);
    writeFileSync(f, Buffer.from(data, "base64"));
    console.log(f);
  }
}
ws.close(); chrome.kill();
try {
  execFileSync("pngquant", ["--quality=80-95", "--speed", "1", "--strip", "--force", "--ext", ".png",
    ...shots.flatMap((s) => [join(OUT, `${s.name}-light.png`), join(OUT, `${s.name}-dark.png`)])]);
  console.log("pngquant: compressed");
} catch { console.log("pngquant not found: images left uncompressed"); }
