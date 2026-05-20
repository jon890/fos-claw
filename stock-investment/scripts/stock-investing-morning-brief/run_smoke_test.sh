#!/usr/bin/env bash
set -euo pipefail
TASK_ROOT="${TASK_ROOT:-$HOME/ai-nodes/stock-investment}"
SKILL_DIR="$(cd "$(dirname "$0")" && pwd)"
WS_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REPORT_DATE="${REPORT_DATE:-smoke-$(date +%Y%m%dT%H%M%S)}" \
SKIP_NOTIFY=1 \
CLAUDE_TIMEOUT_SECONDS=90 \
"$SKILL_DIR/run_report.sh"
