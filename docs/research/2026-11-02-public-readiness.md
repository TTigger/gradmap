# 2026-11-02 Repo 公開前檢查

## 已確認沒問題
- 24 個 commit 全部掃過：沒有 token、API key、密碼、私鑰。`sources/certs/*.pem` 只有公開的 CA 憑證（0 把私鑰）。
- 不進 git 的檔案：`.env.ntfy`（推播主題）、`logs/`、`.worktrees/`、`.vercel/`、簡章 PDF 與抽出文字。歷史中也沒出現過。
- 推播主題只在本機 `.env.ntfy` 與 GitHub 加密 secret；workflow 不會印出它。
- GitHub：只有擁有者一位 collaborator；沒有 deploy key、webhook。Actions 預設權限唯讀、不能核准 PR；workflow 只有排程與手動觸發，陌生人的 PR 無法觸發、拿不到 secret。
- Vercel：Hobby 方案，超量只會暫停、不會收費；Git fork 保護開啟（外人 PR 不會自動部署）；預覽網址需登入 Vercel；沒有環境變數；原始碼與 log 不公開。
- 每日查核：不讀 Issues／PR，工具白名單沒有 gh；上線前三道檢查只允許改資料檔。公開後陌生人沒有管道對排程下指令。
- 網站：安全標頭（CSP 等）、流量統計不用 cookie。npm 正式相依套件 0 個漏洞。
- 內容：沒有個人資料；中央大學的電話是簡章上的學校官方號碼。

## 公開前要處理
1. **commit 作者 email**：24 個 commit 的作者 email 是個人 Gmail，GitHub 個人頁是隱藏 email 的；公開後任何人可從 commit 看到。處理：改寫歷史換成 GitHub 不公開 email（102512862+TTigger@users.noreply.github.com），本 repo 之後也用它提交。需要 force push。
2. **Mac 使用者名稱**：`scripts/com.gradmap.daily-check.plist` 寫死 Mac 使用者家目錄的完整路徑（歷史中還有舊的 weekly-check.plist）。改成安裝時自動帶入路徑，並在改寫歷史時一併清掉。
3. **開發用套件漏洞**：js-yaml（high，只在建置時讀自己的 YAML）、esbuild（moderate，只影響本機開發伺服器）。實際風險低，但公開後會顯示警告，升級即可。
4. **授權條款（需決定）**：沒有 LICENSE＝別人只能看、不能合法重用。建議：程式 MIT、資料 CC BY 4.0（需標示出處），兩者都含「不負擔保」。
5. **免責聲明加強**：頁尾目前寫「資料以各校最新公告為準」。建議加「本站為個人整理、非官方網站，資料可能有誤，報名與應考請以各校簡章及公告為準」。

## 公開後馬上開（private 時免費版不能開）
- Secret scanning＋push protection、Dependabot alerts、private vulnerability reporting。
- main 分支保護：禁止 force push 與刪除。
- 加 SECURITY.md、頁尾加「回報資料錯誤」連到 Issues。
