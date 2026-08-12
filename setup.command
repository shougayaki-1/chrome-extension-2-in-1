#!/bin/zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

URL='https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js'
EXPECTED='edb12c72cdaa11b608eb5967cf1531892b7f3b31'
TMP='vendor/pdf-lib.min.js.tmp'
DEST='vendor/pdf-lib.min.js'

mkdir -p vendor
printf 'pdf-lib 1.17.1 を取得しています...\n'
curl -fL --retry 3 "$URL" -o "$TMP"
BYTES="$(wc -c < "$TMP" | tr -d ' ')"
ACTUAL="$( (printf 'blob %s\0' "$BYTES"; cat "$TMP") | shasum | awk '{print $1}' )"
if [[ "$ACTUAL" != "$EXPECTED" ]]; then
  rm -f "$TMP"
  printf '検証に失敗しました。\nexpected: %s\nactual:   %s\n' "$EXPECTED" "$ACTUAL" >&2
  exit 1
fi
mv "$TMP" "$DEST"

rm -rf extension
mkdir -p extension/src extension/vendor
cp static/manifest.json extension/manifest.json
cp static/popup.html extension/popup.html
cp static/popup.css extension/popup.css
cp static/offscreen.html extension/offscreen.html
cp src/*.js extension/src/
cp "$DEST" extension/vendor/pdf-lib.min.js

printf '\nセットアップ完了:\n%s/extension\n\n' "$ROOT"
printf 'Chromeで chrome://extensions を開き、\n「デベロッパー モード」→「パッケージ化されていない拡張機能を読み込む」→ extension を選択してください。\n'
