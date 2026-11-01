# GradMap 上岸地圖

**A verified dashboard for Taiwan's CS graduate school entrance exams (資工所考試入學).**
Deadlines, exam dates, quotas, subjects and score weights for 14 national universities — every number links back to the page of the official admission brochure it came from.

> 資工所「考試入學」資訊儀表板：報名日程、名額、考科、計分比例，每一筆都附官方簡章頁碼。

🔗 **Live site 網站：<https://gradmap-tw.vercel.app>**

[![Vercel](https://img.shields.io/badge/deployed%20on-Vercel-black?logo=vercel)](https://gradmap-tw.vercel.app)

---

## Features 功能

| | English | 中文 |
|---|---|---|
| 🗓 | **Timeline & calendar** — registration, exam, results and enrollment dates, with weekday and conflict warnings | 時間軸與月曆：報名、考試、放榜、報到，標星期幾與撞期提醒 |
| 📊 | **Compare table** — quotas, papers, weights and tie-breakers across schools | 比較表：名額、試卷、配分、同分參酌 |
| 🧮 | **Prep planner** — tick the subjects you study, see which programs you can apply to | 一份準備能報幾校：勾選準備科目，列出考科完全涵蓋／只差一科的組別 |
| ★ | **My list** — pick schools, see total fees, share via link, export `.ics` | 我的志願：報名費合計、分享連結、匯出行事曆 |
| 📍 | **Itinerary** — exam venues and back-to-back travel warnings | 考場與行程：連考、跨縣市提醒 |
| 📚 | **Past exams index** — where each school publishes past papers, and which years | 考古題索引：官方位置與可取得年度 |
| 📬 | **Results & waitlist** — deadlines you lose your place for missing | 放榜・遞補：不做就喪失資格的期限 |
| 📈 | **History (113–115)** — applicants, admitted, minimum scores from official statistics | 歷年數據：報名、錄取、最低錄取分數 |
| 🔔 | **Change markers** — brochure corrections highlighted for 45 days | 簡章更正標記 |

Scope 範圍: **exam-based admission only** (no 甄試/推甄). Near-kin programs (網媒、網工、資安…) are included, labeled, and can be hidden.
Schools 學校: 台大、清大、陽明交大、成大、政大、台師大、中央、中興、中山、中正、台科大、北科大、台北大學、海大.

## Data trust 資料可信度

| Grade | Source | May change facts? |
|---|---|---|
| **A** | Official brochure / admission site 官方簡章、招生網站 | ✅ Yes |
| **B** | Third party (news, cram schools) 第三方 | ❌ Lead only 只當線索 |
| **C** | Senior students' notes 前輩心得 | ❌ Prep tips only 只放備考情報 |

Page refs 頁碼寫法: `p42 / 38` = PDF page 42 / printed page 38.
`scripts/verify-src.mjs` checks that every date, quota, weight and fee actually appears on the cited page.

## Development 開發

```bash
npm install
npm run dev        # YAML → src/generated/data.json, then Vite dev server
npm run build      # validate data + type-check + build to dist/
```

Requires Node 18+. Data lives in YAML; the site is a static Vite + React build, deployed on Vercel — every push to `main` goes live automatically（推送到 main 會自動部署）.

## Project layout 資料夾結構

```
data/
  registry.yaml          14 schools: aliases, admission sites, stats locations
  subjects.yaml          canonical subject codes (LA/DM/DS/ALG/CO/OS/EN…) and aliases
  schools/<id>.yaml      per school: schedule, programs, groups, quotas, papers, scoring
  pending.yaml           schools whose 116 brochure is not out yet
  history/<id>.yaml      113–115 statistics (published = shown on site)
  past_exams.yaml        past exam paper index
  resources.yaml         prep resources, graded A/B/C
shared/ics.mjs           .ics generator (used by build and browser)
scripts/
  build-data.mjs         YAML → JSON + .ics, with validation
  verify-src.mjs         cross-check data against brochure text
  extract.sh             PDF → per-page text (local only)
  daily-check.sh         daily re-check on branch check/<date>, auto-publish if checks pass
  schedule.sh            install / uninstall / run the daily job (macOS launchd)
sources/<year>/SHA256SUMS  fingerprints of the brochures used (PDFs stay local)
docs/                    decisions, research logs, daily-check instructions (DAILY_CHECK.md)
```

## Daily check 每日查核

`scripts/schedule.sh install` runs a check every day at 09:07 (2026-11-02 → 2027-04-30). It looks for newly published 116 brochures and corrections on a branch `check/<date>`. Changes go live automatically **only if** they touch data files only, `npm run build` passes, and `verify-src.mjs` finds every date / quota / weight on its cited brochure page; otherwise the branch is kept for manual review. Sundays also refresh history stats, past exams and resource links.

每天自動查新簡章與更正公告。只改資料檔、建置通過、簡章頁碼全數核對成功，才會自動推上 main 並更新網站；否則留在分支等人工確認。週日另外補歷年數據、考古題與備考連結。

## Contributing 回報錯誤

Found a wrong date or number? Open an issue with the **school, field, and the official source (URL + page)**. Only grade-A sources change data.
發現資料有誤，請開 issue 並附上官方來源網址與頁碼。

## Disclaimer 免責聲明

Always confirm with the official brochure before registering. This site is an independent aggregation and is not affiliated with any university.
報名前請以各校官方簡章為準；本站為獨立整理，與各校無關。
