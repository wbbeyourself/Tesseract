#!/usr/bin/env bash
DIR="$(cd "$(dirname "$0")" && pwd)"

# 尝试用系统默认浏览器打开（支持 WSL / Linux / macOS）
if command -v wslview  &>/dev/null; then
  wslview "$DIR/index.html"
elif command -v xdg-open &>/dev/null; then
  xdg-open "$DIR/index.html"
elif command -v open &>/dev/null; then
  open "$DIR/index.html"
else
  echo "请手动用浏览器打开: $DIR/index.html"
fi
