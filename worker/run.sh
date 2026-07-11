#!/usr/bin/env bash
# Start the ClassPulse worker (the Upload tab talks to this).
#
#   BUTTERBASE_API_KEY=bb_sk_... ./worker/run.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."

: "${BUTTERBASE_API_KEY:?set BUTTERBASE_API_KEY (bb_sk_...)}"
export BUTTERBASE_APP_ID="${BUTTERBASE_APP_ID:-app_k03t6gua7dg1}"

exec .venv/bin/uvicorn worker.server:app --host 127.0.0.1 --port 8000 --log-level info
