#!/bin/zsh
# 每日流量／速度回報：用 Vercel CLI 讀正式站的匿名統計，整理成一則 ntfy 通知。只讀數據、不改任何設定。
#   scripts/stats-report.sh          今日日報（週日另附近 7 天週報）
#   DRY=1 scripts/stats-report.sh    只印出來、不發通知
# 需要：已登入的 vercel CLI、專案根目錄的 .env.ntfy（NTFY_TOPIC=...）
set -u
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
ROOT="${0:A:h:h}"
cd "$ROOT"
source "$ROOT/.env.ntfy"

TODAY=$(date +%Y-%m-%d)
YDAY=$(date -v-1d +%Y-%m-%d)
WEEK=$(date -v-6d +%Y-%m-%d)
PREVW=$(date -v-13d +%Y-%m-%d)

# 查一個指標，回傳 JSON（失敗回傳空字串）
q() { vercel metrics "$@" --prod -F json 2>/dev/null; }

# 從 JSON 取 summary 的總數
total() { python3 -c 'import json,sys
try:
  d=json.load(sys.stdin); s=d.get("summary") or [{}]; v=next(iter(s[0].values()),0) if s and s[0] else 0
  print(int(round(v or 0)))
except Exception: print("?")'; }

# 分組結果 → 「名稱 數字、名稱 數字」（前 N 名），可傳入名稱對照
top() { python3 -c 'import json,sys,collections
n=int(sys.argv[1]); names=dict(x.split("=",1) for x in sys.argv[2:] if "=" in x)
try:
  d=json.load(sys.stdin); c=collections.Counter()
  for row in d.get("data",[]):
    vals=[v for k,v in row.items() if isinstance(v,(int,float)) and k!="timestamp"]
    labs=[v for k,v in row.items() if isinstance(v,str) and k!="timestamp"]
    if vals and labs: c[labs[0]]+=vals[0]
  out=[f"{names.get(k or "-",k)} {int(v)}" for k,v in c.most_common() if v][:n]
  print("、".join(out) or "—")
except Exception: print("?")' "$@"; }

TABS="/=首頁 /timeline=時間軸 /calendar=行事曆 /compare=比較表 /matrix=考科 /history=歷年數據 /past=考古題 /after=放榜遞補 /resources=備考情報 /pending=待公告"
TZ_OPT=(--bucket-timezone Asia/Taipei)
SINCE_T="${TODAY}T00:00:00+08:00"
SINCE_Y="${YDAY}T00:00:00+08:00"

pv_t=$(q vercel.analytics_pageview.count --since "$SINCE_T" | total)
pv_y=$(q vercel.analytics_pageview.count --since "$SINCE_Y" --until "$SINCE_T" | total)
uv_t=$(q vercel.analytics_pageview.count -a unique/visitor_id --since "$SINCE_T" -g 1d $TZ_OPT | total)
tabs_t=$(q vercel.analytics_pageview.count --since "$SINCE_T" --group-by request_path | top 3 ${=TABS})
dev_t=$(q vercel.analytics_pageview.count --since "$SINCE_T" --group-by device_type | top 2 mobile=手機 desktop=電腦)
br_t=$(q vercel.analytics_pageview.count --since "$SINCE_T" --group-by browser_name | top 5)
ref_t=$(q vercel.analytics_pageview.count --since "$SINCE_T" --group-by referrer_hostname | top 3 "-=直接開啟")
lcp=$(q vercel.speed_insights.lcp_ms -a p75 --since "$(date -v-7d +%Y-%m-%d)T00:00:00+08:00" | total)
lcp_n=$(q vercel.speed_insights.lcp_count --since "$(date -v-30d +%Y-%m-%d)T00:00:00+08:00" | total)

# 網站是否正常
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "https://gradmap-tw.vercel.app/?analytics=off")

# 分享管道：LINE / Facebook / Instagram 內建瀏覽器
share=$(print -r -- "$br_t" | tr '、' '\n' | grep -E '^(Line|Facebook|Instagram|Threads)' | sed 's/^Line/LINE/' | paste -sd '、' -)

msg="瀏覽 ${pv_t}（昨天 ${pv_y}）・訪客 ${uv_t}
熱門：${tabs_t}
裝置：${dev_t}
來源：${ref_t}${share:+（社群 App 內開啟：$share）}"
if [[ "$lcp" != "?" && "$lcp" != 0 ]]; then
  lcp_s=$(python3 -c "print(f'{$lcp/1000:.1f}')")
  msg+="
速度（近 7 天 p75）：主要內容 ${lcp_s} 秒"
else
  msg+="
速度：資料還在累積"
fi
[[ "$lcp_n" != "?" && "$lcp_n" -gt 8000 ]] && msg+="
⚠️ Speed Insights 近 30 天 ${lcp_n} 筆，接近免費上限 10,000"
[[ "$code" != 200 ]] && msg+="
⚠️ 正式站回應 ${code}，請檢查"

title="📊 GradMap 今日 ${TODAY:5}"
prio=default
[[ "$code" != 200 ]] && prio=high
[[ "$pv_y" != "?" && "$pv_t" != "?" && "$pv_t" -ge 50 && "$pv_t" -ge $((pv_y * 3)) ]] && { title="📈 GradMap 今日瀏覽大增 ${TODAY:5}"; prio=high; }

# 週日附週報
if [[ $(date +%u) == 7 ]]; then
  SW="${WEEK}T00:00:00+08:00"; SP="${PREVW}T00:00:00+08:00"
  pv_w=$(q vercel.analytics_pageview.count --since "$SW" | total)
  pv_p=$(q vercel.analytics_pageview.count --since "$SP" --until "$SW" | total)
  uv_w=$(q vercel.analytics_pageview.count -a unique/visitor_id --since "$SW" -g 1d $TZ_OPT | total)
  tabs_w=$(q vercel.analytics_pageview.count --since "$SW" --group-by request_path -l 10 | top 10 ${=TABS})
  msg+="

【近 7 天】瀏覽 ${pv_w}（前 7 天 ${pv_p}）・訪客 ${uv_w}
分頁排名：${tabs_w}"
fi

if [[ -n "${DRY:-}" ]]; then print -r -- "$title"; print -r -- "$msg"; exit 0; fi
curl -s -o /dev/null -w '%{http_code}\n' -H "Title: $title" -H "Priority: $prio" -H "Tags: bar_chart" -d "$msg" "https://ntfy.sh/$NTFY_TOPIC"
mkdir -p "$ROOT/logs"; { print -- "## $(date '+%F %H:%M')"; print -r -- "$msg"; print; } >> "$ROOT/logs/stats.log"
