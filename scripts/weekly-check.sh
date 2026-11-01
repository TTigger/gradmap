#!/bin/zsh
# 每週查核：在獨立的 git worktree（.worktrees/check-<日期>）開分支 check/<日期>，
# 讓 Claude 依 docs/WEEKLY_CHECK.md 查資料，完成後跳 macOS 通知。不會動 main、不會 push。
# 由 launchd（scripts/com.gradmap.weekly-check.plist）每週日早上觸發；也可以手動執行。
set -eu
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

ROOT="${0:A:h:h}"
TODAY=$(date +%Y-%m-%d)
START="2026-11-15"   # 從這天開始
END="2027-04-30"     # 考季結束後自動停止

if [[ "$TODAY" < "$START" || "$TODAY" > "$END" ]] && [[ "${FORCE:-}" != 1 ]]; then
  exit 0
fi

cd "$ROOT"
mkdir -p logs
LOG="logs/weekly-check-$TODAY.log"
BRANCH="check/$TODAY"
WT=".worktrees/check-$TODAY"

notify() { osascript -e "display notification \"$1\" with title \"GradMap 每週查核\"" || true; }

if git show-ref --quiet "refs/heads/$BRANCH"; then
  echo "今天已經跑過（分支 $BRANCH 已存在）" >> "$LOG"; exit 0
fi

git worktree add -b "$BRANCH" "$WT" main >> "$LOG" 2>&1
ln -s "$ROOT/node_modules" "$WT/node_modules"
# 已下載的原始檔不進 git，直接共用
for d in sources; do rsync -a --ignore-existing "$ROOT/$d/" "$WT/$d/"; done

cd "$WT"
if claude -p "請依照 docs/WEEKLY_CHECK.md 執行今天（$TODAY）的每週查核。" \
    --permission-mode acceptEdits \
    --allowedTools "Read,Write,Edit,Glob,Grep,WebSearch,WebFetch,Bash(curl:*),Bash(mutool:*),Bash(python3 scripts/*),Bash(scripts/extract.sh:*),Bash(npm run data),Bash(node scripts/verify-src.mjs),Bash(git add:*),Bash(git commit:*),Bash(git status),Bash(git diff:*),Bash(shasum:*),Bash(ls:*),Bash(mkdir:*),Bash(file:*)" \
    >> "$ROOT/$LOG" 2>&1; then
  # 新下載的原始檔同步回主資料夾，之後才找得到
  rsync -a --ignore-existing "sources/" "$ROOT/sources/"
  notify "查核完成，請看分支 $BRANCH 的報告 docs/research/$TODAY-weekly-check.md"
else
  notify "查核失敗，請看 $LOG"
fi
