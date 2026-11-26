#!/usr/bin/env bash
# One-shot starter for Call Guard on Mac (API + Expo web)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
SERVER="$ROOT/server"
MOBILE="$ROOT/mobile"

echo "==> Call Guard root: $ROOT"

if [[ ! -d "$SERVER" || ! -d "$MOBILE" ]]; then
  echo "找不到 server/ 或 mobile/。"
  echo "請先：cd ~/Call-Guard/Call-Guard 再跑呢個 script。"
  exit 1
fi

# Stop anything already on common ports (ignore errors)
lsof -ti :8787 | xargs kill -9 2>/dev/null || true
lsof -ti :8081 | xargs kill -9 2>/dev/null || true

echo "==> Installing API deps"
cd "$SERVER"
npm install
npm run seed

echo "==> Starting API on http://127.0.0.1:8787"
npm start > /tmp/call-guard-api.log 2>&1 &
API_PID=$!
sleep 1
if ! kill -0 "$API_PID" 2>/dev/null; then
  echo "API 啟動失敗，睇 /tmp/call-guard-api.log"
  cat /tmp/call-guard-api.log
  exit 1
fi
echo "API pid=$API_PID（log: /tmp/call-guard-api.log）"

echo "==> Installing mobile deps (含 web)"
cd "$MOBILE"
npm install
npx expo install react-dom react-native-web

echo "==> Starting Expo Web（瀏覽器會開；唔使掃 QR）"
echo "    停止：喺呢個 Terminal 撳 Ctrl+C（之後可手動 kill API: kill $API_PID）"
npx expo start --web
