#!/usr/bin/env bash
# One-shot starter for Call Guard on Mac (API + Expo web)
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
SERVER="$ROOT/server"
MOBILE="$ROOT/mobile"

echo "==> Call Guard root: $ROOT"

if [ ! -d "$SERVER" ] || [ ! -d "$MOBILE" ]; then
  echo "Cannot find server/ or mobile/."
  echo "Run from: cd ~/Call-Guard/Call-Guard"
  exit 1
fi

# Free ports if needed
lsof -ti :8787 | xargs kill -9 2>/dev/null || true
lsof -ti :8081 | xargs kill -9 2>/dev/null || true

echo "==> Installing API deps"
cd "$SERVER"
npm install
npm run seed

echo "==> Starting API on http://127.0.0.1:8787"
npm start > /tmp/call-guard-api.log 2>&1 &
API_PID=$!
sleep 2

if kill -0 "$API_PID" 2>/dev/null; then
  echo "==> API started (pid $API_PID). Log: /tmp/call-guard-api.log"
else
  echo "==> API failed to start. Log:"
  cat /tmp/call-guard-api.log
  exit 1
fi

echo "==> Installing mobile deps (including web)"
cd "$MOBILE"
npm install
npx expo install react-dom react-native-web

echo "==> Starting Expo Web"
echo "    When ready, open: http://localhost:8081"
echo "    Stop with Ctrl+C. To stop API later: kill $API_PID"
npx expo start --web
