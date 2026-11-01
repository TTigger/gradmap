# 每週查核工作說明

這份是給每週排程（`scripts/weekly-check.sh`）執行的 Claude 看的。人也可以照著手動做。

## 目標

找出各校新公告的官方資料，查證後更新 `data/`，讓使用者審核要不要採納。**不要直接改 main**：排程會開一個獨立的分支（`check/<日期>`），所有修改都留在那個分支，最後寫一份報告。

## 每次要做的事（依優先順序）

1. **116 簡章**：讀 `data/pending.yaml` 與 `data/registry.yaml`。對每所還沒查證的學校，到 registry 列的招生網站看 116 學年度碩士班考試入學簡章是否公告。
   - 公告了：下載 PDF 到 `sources/116/<id>.pdf`，用 `scripts/extract.sh 116` 抽文字，依照現有 `data/schools/ntnu.yaml` 的格式建立 `data/schools/<id>.yaml`（status: verified），並從 `pending.yaml` 移除。
   - 每個日期、名額、考科、比例、同分參酌都要附簡章頁碼（`p<PDF頁> / <印刷頁>`）。
   - **資工所依實際內容判斷，不看名稱**；近親所標 `kind: near_kin`。
   - **今年改成只書審（不考筆試）的系所要設 `review_only: true`，並在報告最上面特別寫出來。**
2. **已查證學校的更正公告**：看各校招生網站有沒有「簡章更正」「日程異動」公告。有的話：
   - 改 `data/schools/<id>.yaml` 裡的欄位（日期、名額、考科…），並更新 `brochure.verified`。
   - **同時在該檔最後的 `changes:` 新增一筆**，網站會在首頁「最近的簡章更正」與對應欄位標出變動（45 天內）：
     ```yaml
     changes:
       - { date: "2026-11-20", where: schedule.register, what: 報名截止延到 11/25, before: "11/20 17:00", after: "11/25 17:00", src: "更正公告 p1" }
     ```
     `where` 只能是 `schedule.<日程類型>`（register／payment／upload／exam／result／enroll…）、`group:<組別 id>`、`fee` 或 `school`。
   - 在報告「⚠️ 需要你注意」列出。
3. **歷年數據**：讀 `data/history/*.yaml` 的 `todo` 清單（只給排程看，不會出現在網站），逐項到 registry 的連結或招生網站找官方檔案（報名人數、錄取情況、最低錄取分數）。下載的檔案放 `sources/history/<id>/`。
   - 找到就補進 `records`（每筆附 `src: <來源id> p<頁>`），來源加 `checked: "<今天>"`；資工本所那一列加 `main: true`（會畫進趨勢圖）。
   - 補完把該項從 `todo` 移除，並更新 `published`（給使用者看的一句話：這所學校公開了什麼）。`published` 不要寫內部操作細節（網站結構、下載失敗、檔案路徑）。
   - **只收考試入學（一般考試）的數字**。很多學校的統計表把甄試和考試並列，一定要轉成圖片看欄位標題，只取「考試入學」欄。
4. **備考情報**：確認 `data/resources.yaml` 的連結還打得開（更新 `checked`）；打不開的在報告列出，不要自己刪。可以新增，但每筆要標 grade（A 官方 / B 第三方 / C 個人）。
5. **考古題索引**（`data/past_exams.yaml`）：每年 8–9 月各校圖書館會上架新一年的試題。確認連結還有效、把 `years` 的上限往後延；`unsure` 或沒有 `years` 的學校，用瀏覽器打開確認資工所的年度後補上。只收碩士班考試（筆試）試題。
6. **考場與遞補規則**：新簡章公告時，同時填 `venue`（考區、地點、頁碼；可選考區的加 `choose: true`）和 `waitlist_info`（`alert` 寫「沒做就放棄資格」的動作，`how` 寫遞補方式，`where` 寫公告網址，`src` 寫頁碼）。
7. 執行 `npm run data`，必須通過檢查；有新增或修改 116 簡章資料時，再執行 `node scripts/verify-src.mjs`（自動核對每個日期、名額、比例是否真的出現在標註的簡章頁），找不到的項目要打開 PDF 確認或修正頁碼。

## 查證規則

- 只採用官方來源（grade A）當網站上的正式資料；新聞、補習班數字只能放在 history 並標 grade B，或放 resources。
- 數字一律打開原始 PDF 核對；表格版面複雜時用 `mutool draw -r 90 -o x.png file.pdf <頁>` 轉成圖片看。
- 搜尋摘要裡的數字不能直接用。
- 不可以關閉 TLS 憑證檢查，也不要偽裝瀏覽器繞過網站的阻擋。伺服器沒送完整憑證鏈時（例：陽明交大），用 `curl --cacert sources/certs/bundle-with-twca.pem` 補上中繼憑證，仍是完整驗證。抓不到就記在報告的「需要人工處理」。
- 不要 push、不要部署、不要動 main。

## 報告

寫在 `docs/research/<日期>-weekly-check.md`，格式：

```
# <日期> 每週查核
## ⚠️ 需要你注意（改成書審、日期變動、名額大幅變動）
## 新增／更新
## 沒有變化
## 需要人工處理（抓不到的網站、看不懂的表格）
```

最後 `git add -A && git commit`，訊息寫「每週查核 <日期>：<一句摘要>」。
