#!/bin/zsh
# 安裝／移除／查看每日查核排程
#   scripts/schedule.sh install    安裝（每天 12:10、17:40，2026/11/2 起，2027/4/30 後自動不跑）
#   scripts/schedule.sh uninstall  移除
#   scripts/schedule.sh status     看是否已安裝
#   scripts/schedule.sh run        立刻手動跑一次（不受起始日限制）
set -eu
ROOT="${0:A:h:h}"
NAME=com.gradmap.daily-check
DEST="$HOME/Library/LaunchAgents/$NAME.plist"
mkdir -p "$ROOT/logs"

case "${1:-status}" in
  install)
    cp "$ROOT/scripts/$NAME.plist" "$DEST"
    launchctl bootout "gui/$(id -u)/$NAME" 2>/dev/null || true
    launchctl bootstrap "gui/$(id -u)" "$DEST"
    echo "已安裝：每天 12:10、17:40 執行（2026-11-02 起，週日中午做完整查核）" ;;
  uninstall)
    launchctl bootout "gui/$(id -u)/$NAME" 2>/dev/null || true
    rm -f "$DEST"
    echo "已移除" ;;
  status)
    launchctl print "gui/$(id -u)/$NAME" 2>/dev/null | grep -E "state|path" || echo "未安裝" ;;
  run)
    FORCE=1 "$ROOT/scripts/daily-check.sh" ;;
esac
