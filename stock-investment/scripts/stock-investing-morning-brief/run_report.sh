#!/usr/bin/env bash
set -euo pipefail

if [[ "${TRACK_TASK_WRAPPED:-0}" != "1" ]]; then
  export TRACK_TASK_WRAPPED=1
  TASK_ROOT="${TASK_ROOT:-$HOME/ai-nodes/stock-investment}"
  TRACKER="${TRACKER:-$HOME/ai-nodes/_shared/bin/track_task.sh}"
  exec "$TRACKER" "$TASK_ROOT" "stock-investment:morning-brief" "$0" "$@"
fi

TASK_ROOT="${TASK_ROOT:-$HOME/ai-nodes/stock-investment}"
REPORT_DATE="${REPORT_DATE:-$(TZ=Asia/Seoul date +%F)}"
OUTPUT_ROOT="${OUTPUT_ROOT:-$TASK_ROOT/data}"
OUTDIR="$OUTPUT_ROOT/$REPORT_DATE"
SKILL_DIR="$(cd "$(dirname "$0")" && pwd)"
WS_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WATCHLIST="$TASK_ROOT/config/watchlist.json"
SOURCES="$TASK_ROOT/config/sources.json"
MARKET_JSON="$OUTDIR/market-data.json"
NEWS_JSON="$OUTDIR/raw-news.json"
ANALYSIS_INPUT="$OUTDIR/analysis-input.md"
CLAUDE_JSON="$OUTDIR/claude.result.json"
REPORT_MD="$OUTDIR/report.md"
PROMPT_FILE="$WS_ROOT/.claude/skills/stock-investing-morning-brief/references/claude-prompt.md"
COLLECTOR="$SKILL_DIR/collect_sources.py"
NOTIFIER="$SKILL_DIR/notify_discord.sh"
EXTRACT="$HOME/ai-nodes/_shared/lib/extract_claude_result.ts"

mkdir -p "$OUTDIR"

python3 "$COLLECTOR" "$WATCHLIST" "$SOURCES" "$MARKET_JSON" "$NEWS_JSON"

{
  cat "$PROMPT_FILE"
  printf '\n\n기준일: %s Asia/Seoul\n' "$REPORT_DATE"
  printf '\n다음은 market-data.json 입니다:\n```json\n'
  cat "$MARKET_JSON"
  printf '\n```\n\n다음은 raw-news.json 입니다:\n```json\n'
  cat "$NEWS_JSON"
  printf '\n```\n'
} > "$ANALYSIS_INPUT"

if timeout "${CLAUDE_TIMEOUT_SECONDS:-120}" claude --permission-mode bypassPermissions --print --output-format json "$(cat "$ANALYSIS_INPUT")" > "$CLAUDE_JSON"; then
  bun run "$EXTRACT" "$CLAUDE_JSON" "$REPORT_MD" "${TRACK_TASK_CLAUDE_USAGE_FILE:-}"
else
  cat > "$REPORT_MD" <<FALLBACK
[CRCL/BTC 모닝 체크] $REPORT_DATE

1) 오늘의 결론
- CRCL: 중립 — 데이터 수집은 완료했지만 Claude 요약 생성에 실패했습니다.
- BTC: 중립 — market-data/raw-news 파일을 확인해야 합니다.

2) 생성 파일
- market-data: $MARKET_JSON
- raw-news: $NEWS_JSON

※ 자동 수집 기반 요약이며, 투자 판단은 추가 확인 필요.
FALLBACK
fi

if [[ "${SKIP_NOTIFY:-0}" != "1" && -x "$NOTIFIER" ]]; then
  "$NOTIFIER" "$(cat "$REPORT_MD")" || true
fi

echo "Wrote: $REPORT_MD"
echo "Wrote: $MARKET_JSON"
echo "Wrote: $NEWS_JSON"
echo "Wrote: $ANALYSIS_INPUT"
