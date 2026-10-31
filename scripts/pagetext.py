#!/usr/bin/env python3
"""抓網頁（透過 curl），輸出純文字＋連結清單（只列含關鍵字的連結）。
用法：scripts/pagetext.py <url> [關鍵字,關鍵字...] [--text N]"""
import sys, re, html, subprocess, urllib.parse
url = sys.argv[1]
kw = sys.argv[2].split(",") if len(sys.argv) > 2 else ["116", "簡章", "碩士"]
n = int(sys.argv[sys.argv.index("--text") + 1]) if "--text" in sys.argv else 1500
r = subprocess.run(["curl", "-sL", "--max-time", "30", "-A", "Mozilla/5.0", url], capture_output=True)
if r.returncode:
    sys.exit(f"curl 失敗（exit {r.returncode}）：{url}")
t = r.stdout.decode("utf-8", "ignore")
links = re.findall(r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', t, flags=re.S)
body = re.sub(r"<script.*?</script>|<style.*?</style>", "", t, flags=re.S)
body = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", body)))
print("TEXT:", body[:n])
print("\nLINKS:")
seen = set()
for href, label in links:
    label = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", label))).strip()
    full = urllib.parse.urljoin(url, html.unescape(href))
    if any(k in label or k in full for k in kw) and full not in seen:
        seen.add(full); print(f"- {label[:80]} | {full}")
