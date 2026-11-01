# 2026-11-01 優化與改善調查

## 實測
- Lighthouse（手機模式，正式網站）：效能 100、最佳實踐 100、SEO 100、無障礙 90。
  - LCP 1.3s、TBT 20ms、CLS 0。JS 260KB（gzip 約 85KB，其中資料 90KB→gzip 15KB）。
  - 無障礙扣分：頁尾 `<code>` 灰字對比 4.18（需 4.5）；時間軸表頭 `role="row"` 缺子元素角色；標題層級 h1 → h3 跳過 h2。
- 安全標頭：只有 HSTS；沒有 X-Content-Type-Options、Referrer-Policy、CSP。
- `/favicon.ico`、`/robots.txt` 404；沒有 apple-touch-icon、沒有社群分享預覽（og:title / og:image）。favicon 還是舊的藍色 #2563eb。

## 建議（依優先順序）

### 高：影響資料正確與時效
1. **清大、成大的每日查核抓不到**：兩校招生頁由 JavaScript 載入，排程用的抓取工具讀不到內容 → 公告了也不會自動發現。解法：讓排程改搜尋簡章 PDF 直連（WebSearch＋已知檔名規則），或每週用瀏覽器人工補查。
2. **每日排程還沒實際跑過**：明早 9:07 第一次執行。建議今晚手動跑一次（`scripts/schedule.sh run`），確認背景執行時 Claude 登入、GitHub 推送、通知都正常。
3. **網站看不出「最近一次查核」**：沒變動的日子不會 commit，網站只顯示建置時間。建議每天寫一行查核紀錄（例：「每日自動查核，最近一次 11/2 09:07，無變動」），讓使用者知道資料是新的。代價：每天會觸發一次部署（免費額度內）。
4. **補資料**：
   - 中山 115 簡章已找到網址，可先加成參考年度（像台大、陽明交大）。
   - 中正還沒找到招生網頁。

### 中：讓更多人用、用得放心
5. **社群分享預覽**：在 LINE、Dcard、FB 貼連結時目前沒有標題圖。加 og:title、og:description、og:image（1200×630）。
6. **加到主畫面**：加 apple-touch-icon 與 web manifest，手機可以像 App 一樣開；favicon 換成新的配色。
7. **回報管道**：repo 是 private，一般使用者沒辦法開 issue。需要一個公開的回報方式（例：Google 表單或 email），網站頁尾放連結。**需要你決定用哪種。**
8. **使用量統計（選用）**：Vercel Web Analytics 不用 cookie、不追蹤個人，可以知道多少人用、哪個分頁最常看。

### 低：品質細節
9. 無障礙三項修正（對比、時間軸角色、標題層級）→ 無障礙分數可到 100。
10. 安全標頭：加 X-Content-Type-Options、Referrer-Policy、基本 CSP。
11. 手機版篩選列：「行事曆」按鈕自己佔一整行，改成和「顯示近親所」同一行。
12. robots.txt 與 sitemap（網站只有一頁，影響小）。
