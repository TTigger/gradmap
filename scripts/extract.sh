#!/bin/sh
# 把 sources/<年度>/ 裡的簡章 PDF 逐頁抽成文字，放到 sources/<年度>/text/<校>/
# 用法：scripts/extract.sh 116
set -e
cd "$(dirname "$0")/../sources/$1"
for pdf in *.pdf; do
  name="${pdf%.pdf}"
  mkdir -p "text/$name"
  mutool draw -F txt -o "text/$name/p%03d.txt" "$pdf" 2>/dev/null
  echo "$name: $(ls text/$name | wc -l | tr -d ' ') 頁"
done
