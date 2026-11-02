#!/bin/zsh
# 每日查核：在獨立的 git worktree 開分支 check/<日期>，讓 Claude 依 docs/DAILY_CHECK.md 查新公告與更正。
# 有改資料、而且通過三道檢查（只動資料檔、npm run build、verify-src）→ 自動推到 GitHub main，Vercel 會自動更新網站。
# 沒通過 → 留在分支、不上線，跳通知請人看。
# 由 launchd（scripts/com.gradmap.daily-check.plist）每天 12:10、17:40 觸發；也可以手動執行 scripts/schedule.sh run。
set -eu
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

ROOT="${0:A:h:h}"
TODAY=$(date +%Y-%m-%d)
START="2026-11-02"   # 從這天開始
END="2027-04-30"     # 考季結束後自動停止
SLOT=$(date +%H%M)
# 週日中午那次做完整查核（歷年數據、考古題、備考連結），其他只查新簡章與更正
[[ $(date +%u) == 7 && $(date +%H) -lt 15 ]] && MODE=full || MODE=quick

if [[ "$TODAY" < "$START" || "$TODAY" > "$END" ]] && [[ "${FORCE:-}" != 1 ]]; then
  exit 0
fi

cd "$ROOT"
mkdir -p logs
LOG="$ROOT/logs/check-$TODAY.log"
BRANCH="check/$TODAY-$SLOT"
WT=".worktrees/check-$TODAY-$SLOT"

# 通知：Mac 右上角＋手機（ntfy；主題名稱放在不進 git 的 .env.ntfy）
NTFY_TOPIC=""; [[ -f "$ROOT/.env.ntfy" ]] && source "$ROOT/.env.ntfy"
notify() {
  osascript -e "display notification \"$1\" with title \"GradMap 每日查核\"" || true
  [[ -n "$NTFY_TOPIC" ]] && jq -n --arg t "$NTFY_TOPIC" --arg m "$1" '{topic:$t,title:"GradMap 每日查核",message:$m,click:"https://gradmap-tw.vercel.app"}' \
    | curl -sS -m 15 -o /dev/null -H "Content-Type: application/json" -d @- https://ntfy.sh || true
}
# 寫入查核時間（網站標頭會顯示）
write_stamp() { printf 'at: "%s"\nresult: "%s"\n' "$(date +%Y-%m-%dT%H:%M)" "$2" > "$1/data/last_check.yaml"; }
# 只推送查核時間（沒有變動，或新資料沒通過檢查時）；以 GitHub 上的 main 為基礎，不帶其他修改
stamp_only() {
  local tmp="$ROOT/.worktrees/stamp-$TODAY-$SLOT"
  git -C "$ROOT" worktree add -q --detach "$tmp" origin/main >> "$LOG" 2>&1 || return 1
  write_stamp "$tmp" "$1"
  git -C "$tmp" add data/last_check.yaml && git -C "$tmp" commit -qm "查核 $TODAY $(date +%H:%M)：$1" >> "$LOG" 2>&1 \
    && git -C "$tmp" push -q origin HEAD:main >> "$LOG" 2>&1 || echo "查核時間推送失敗" >> "$LOG"
  git -C "$ROOT" worktree remove --force "$tmp" >> "$LOG" 2>&1 || true
  sync_local
}
# 本機 main 沒有未提交的修改時，跟 GitHub 同步
sync_local() {
  git -C "$ROOT" fetch -q origin main >> "$LOG" 2>&1 || true
  if [[ "$(git -C "$ROOT" branch --show-current)" == main && -z "$(git -C "$ROOT" status --porcelain --untracked-files=no)" ]]; then
    git -C "$ROOT" merge -q --ff-only origin/main >> "$LOG" 2>&1 || true
  fi
}
cleanup() { cd "$ROOT"; git worktree remove --force "$WT" >> "$LOG" 2>&1 || true; git branch -D "$BRANCH" >> "$LOG" 2>&1 || true; }

if git show-ref --quiet "refs/heads/$BRANCH"; then
  echo "這個時段已經跑過（分支 $BRANCH 已存在）" >> "$LOG"; exit 0
fi
echo "=== $(date +%H:%M) 開始（${MODE}）===" >> "$LOG"

# 以 GitHub 上最新的 main 為基礎
git fetch -q origin main >> "$LOG" 2>&1
BASE=$(git rev-parse origin/main)
git worktree add -b "$BRANCH" "$WT" origin/main >> "$LOG" 2>&1
ln -s "$ROOT/node_modules" "$WT/node_modules"
# 已下載的原始檔不進 git，直接共用
rsync -a --ignore-existing "$ROOT/sources/" "$WT/sources/"

cd "$WT"
if ! claude -p "請依照 docs/DAILY_CHECK.md 執行今天（${TODAY}）$(date +%H:%M) 的查核，模式：${MODE}。" \
    --permission-mode acceptEdits \
    --allowedTools "Read,Write,Edit,Glob,Grep,WebSearch,WebFetch,Bash(curl:*),Bash(mutool:*),Bash(python3 scripts/*),Bash(scripts/extract.sh:*),Bash(npm run data),Bash(node scripts/verify-src.mjs),Bash(git add:*),Bash(git commit:*),Bash(git status),Bash(git diff:*),Bash(shasum:*),Bash(ls:*),Bash(mkdir:*),Bash(file:*),Bash(grep:*),Bash(head:*),Bash(tail:*),Bash(cat:*),Bash(wc:*),Bash(sort:*),Bash(uniq:*),Bash(jq:*),Bash(sed -n:*),Bash(diff:*),Bash(date:*)" \
    >> "$LOG" 2>&1; then
  notify "查核執行失敗，請看 logs/check-$TODAY.log"; exit 1
fi
# 新下載的原始檔同步回主資料夾
rsync -a --ignore-existing "sources/" "$ROOT/sources/"

if [[ -z "$(git log --oneline origin/main..HEAD)" ]]; then
  echo "沒有變更" >> "$LOG"; cleanup; stamp_only "無變動"
  notify "$(date +%H:%M) 查核完成：今日無變動"; exit 0
fi

# 三道檢查：只能動資料、報告與來源指紋；建置驗證；簡章頁碼核對
fail=""
bad_files=$(git diff --name-only origin/main..HEAD | grep -vE '^(data/|docs/research/|sources/.*SHA256SUMS$)' || true)
[[ -n "$bad_files" ]] && fail="改到資料以外的檔案：$bad_files"
[[ -z "$fail" ]] && { npm run build >> "$LOG" 2>&1 || fail="建置檢查沒通過"; }
[[ -z "$fail" ]] && { node scripts/verify-src.mjs >> "$LOG" 2>&1 || fail="簡章頁碼核對有找不到的項目"; }

SUMMARY=$(git log -1 --format=%s)
if [[ -n "$fail" ]]; then
  echo "未上線：$fail" >> "$LOG"
  cd "$ROOT"; stamp_only "有新公告，人工確認中"
  notify "有新資料但未上線（${fail}），請看分支 $BRANCH"
  exit 0
fi

write_stamp "." "已更新"
git add data/last_check.yaml && git commit -qm "查核 $TODAY $(date +%H:%M)：記錄查核時間" >> "$LOG" 2>&1
if git push -q origin "HEAD:main" >> "$LOG" 2>&1; then
  cd "$ROOT"; sync_local
  ALERT=$( { sed -n '/需要你注意/,/^## 新增/p' "$WT/docs/research/checks/$TODAY.md" 2>/dev/null | grep -c '^- '; } || true )
  ALERT=${ALERT:-0}
  # 新加入的學校：提醒人工複查（自動核對只能確認數字有出處，不能確認沒漏掉規定）
  NEW_SCHOOLS=""
  for f in $(git -C "$WT" diff --name-only --diff-filter=A "$BASE"..HEAD -- data/schools/); do
    NEW_SCHOOLS+="$(sed -n 's/^short: *//p' "$WT/$f")（${${f:t}%.yaml}） "
  done
  cleanup
  if [[ -n "$NEW_SCHOOLS" ]]; then notify "新增學校：${NEW_SCHOOLS}建議複查（開 Claude 說「複查 <學校>」）"; fi
  if [[ "$ALERT" != 0 ]]; then notify "網站已更新，有 $ALERT 項需要你注意：$SUMMARY"; else notify "網站已更新：$SUMMARY"; fi
else
  notify "推送失敗，資料留在分支 ${BRANCH}，請看 log"
fi
