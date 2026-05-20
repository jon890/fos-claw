#!/usr/bin/env bash
set -euo pipefail

if [[ "${TRACK_TASK_WRAPPED:-0}" != "1" ]]; then
  export TRACK_TASK_WRAPPED=1
  TASK_ROOT="${TASK_ROOT:-$HOME/ai-nodes/stock-investment}"
  TRACKER="${TRACKER:-$HOME/ai-nodes/_shared/bin/track_task.sh}"
  ISSUE_KEY="${1:-us-clarity-act}"
  exec "$TRACKER" "$TASK_ROOT" "stock-investment:issue:$ISSUE_KEY" "$0" "$@"
fi

TASK_ROOT="${TASK_ROOT:-$HOME/ai-nodes/stock-investment}"
ISSUE_KEY="${1:-us-clarity-act}"
REPORT_DATE="${REPORT_DATE:-$(TZ=Asia/Seoul date +%F)}"
SKILL_DIR="$(cd "$(dirname "$0")" && pwd)"
WS_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUTDIR="$TASK_ROOT/data/issues/$REPORT_DATE/$ISSUE_KEY"
CONFIG="$TASK_ROOT/config/current-issues.json"
RAW_JSON="$OUTDIR/raw-sources.json"
META_JSON="$OUTDIR/issue-meta.json"
ANALYSIS_INPUT="$OUTDIR/analysis-input.md"
CLAUDE_JSON="$OUTDIR/claude.result.json"
REPORT_MD="$OUTDIR/report.md"
PROMPT_FILE="$WS_ROOT/.claude/skills/current-issue-analysis/references/issue-prompt.md"
COLLECTOR="$SKILL_DIR/collect_issue_sources.py"
NOTIFIER="$SKILL_DIR/notify_discord.sh"
EXTRACT="$HOME/ai-nodes/_shared/lib/extract_claude_result.ts"

mkdir -p "$OUTDIR"
python3 "$COLLECTOR" "$CONFIG" "$ISSUE_KEY" "$RAW_JSON" "$META_JSON"

{
  cat "$PROMPT_FILE"
  printf '\n\n기준일: %s Asia/Seoul\n' "$REPORT_DATE"
  printf '\nissue-meta.json:\n```json\n'
  cat "$META_JSON"
  printf '\n```\n\nraw-sources.json:\n```json\n'
  cat "$RAW_JSON"
  printf '\n```\n'
} > "$ANALYSIS_INPUT"

if timeout "${CLAUDE_TIMEOUT_SECONDS:-180}" claude --permission-mode bypassPermissions --print --output-format json "$(cat "$ANALYSIS_INPUT")" > "$CLAUDE_JSON"; then
  bun run "$EXTRACT" "$CLAUDE_JSON" "$REPORT_MD" "${TRACK_TASK_CLAUDE_USAGE_FILE:-}"
else
  cat > "$REPORT_MD" <<FALLBACK
[현안 분석] $ISSUE_KEY — $REPORT_DATE

Claude 요약 생성에 실패했습니다.

생성 파일:
- raw sources: $RAW_JSON
- analysis input: $ANALYSIS_INPUT

※ 자동 수집 기반 현안 분석이며, 법률/투자 판단은 추가 확인 필요.
FALLBACK
fi

if [[ "${SKIP_NOTIFY:-0}" != "1" && -x "$NOTIFIER" ]]; then
  "$NOTIFIER" "$(cat "$REPORT_MD")" || true
fi

echo "Wrote: $REPORT_MD"
echo "Wrote: $RAW_JSON"
echo "Wrote: $ANALYSIS_INPUT"
