#!/usr/bin/env bash
# Deploy ClassPulse webapp to Butterbase.
# Usage: ./deploy.sh
#
# Frontend hosts on YOUR Butterbase app (see .deploy.env).
# Dashboard data still reads from the seeded app_k03t6gua7dg1 API.

set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
API="https://api.butterbase.ai"

# load deploy target (created on your account)
if [[ -f "$DIR/.deploy.env" ]]; then
  # shellcheck disable=SC1091
  source "$DIR/.deploy.env"
fi
APP_ID="${APP_ID:-app_tjcz09x4ozy2}"
DEPLOY_URL="${DEPLOY_URL:-https://classpulse-dashboard.butterbase.dev}"

log() { echo "$@" >&2; }

if [[ -z "${BUTTERBASE_API_KEY:-}" && -f "$HOME/.cursor/mcp.json" ]]; then
  BUTTERBASE_API_KEY=$(python3 -c "
import json, pathlib
c = json.loads(pathlib.Path('$HOME/.cursor/mcp.json').read_text())
print(c['mcpServers']['butterbase']['headers']['Authorization'].split(' ', 1)[1])
")
  log "==> API key …${BUTTERBASE_API_KEY: -6}"
fi

if [[ -z "${BUTTERBASE_API_KEY:-}" ]]; then
  log "ERROR: No API key. unset BUTTERBASE_API_KEY && ./deploy.sh"
  exit 1
fi

api_call() {
  local method="$1" url="$2" body="${3:-}"
  local http code resp
  if [[ -n "$body" ]]; then
    http=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
      -H "Authorization: Bearer $BUTTERBASE_API_KEY" \
      -H "Content-Type: application/json" -d "$body")
  else
    http=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
      -H "Authorization: Bearer $BUTTERBASE_API_KEY")
  fi
  code=$(echo "$http" | tail -1)
  resp=$(echo "$http" | sed '$d')
  if [[ "$code" -lt 200 || "$code" -ge 300 ]]; then
    log ""
    log "ERROR: HTTP $code — $method $url"
    log "$resp"
    exit 1
  fi
  echo "$resp"
}

log "==> Deploy target: $APP_ID → $DEPLOY_URL"
log "==> Building…"
cd "$DIR"
npm run build 2>&1 | grep -v "chunks are larger than 500" | grep -v "codeSplitting" | grep -v "chunkSizeWarningLimit" | grep -v "dynamic import" || true
[[ -f dist/index.html ]] || npm run build

log "==> Zipping…"
rm -f frontend.zip
(cd dist && zip -q -r ../frontend.zip .)
log "    $(du -h frontend.zip | cut -f1)"

log "==> Creating deployment…"
RESP=$(api_call POST "$API/v1/$APP_ID/frontend/deployments" '{"framework":"react-vite"}')
DEPLOY_ID=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('deployment_id') or d.get('id'))")
UPLOAD_URL=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['uploadUrl'])")
log "    id: $DEPLOY_ID"

log "==> Uploading…"
UP_HTTP=$(curl -s -w "%{http_code}" -o /dev/null -X PUT "$UPLOAD_URL" \
  -H "Content-Type: application/zip" --data-binary @"$DIR/frontend.zip")
[[ "$UP_HTTP" -ge 200 && "$UP_HTTP" -lt 300 ]] || { log "ERROR: upload HTTP $UP_HTTP"; exit 1; }
log "    OK"

log "==> Starting…"
START=$(api_call POST "$API/v1/$APP_ID/frontend/deployments/$DEPLOY_ID/start")
echo "$START" | python3 -m json.tool >&2

log ""
log "Done! Open $DEPLOY_URL (allow 1–2 min for CDN)"
