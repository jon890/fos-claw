#!/usr/bin/env bash
set -euo pipefail

TASK_ROOT="${TASK_ROOT:-$HOME/ai-nodes/career-os}"
REPORT_DATE="${REPORT_DATE:-$(date +%F)}"
SKILL_DIR="$TASK_ROOT/skills/cj-foodville-coffeechat-prep"
OUTDIR="$TASK_ROOT/data/reports/daily/$REPORT_DATE/cj-foodville-coffeechat"
RUNTIME_OUT="$TASK_ROOT/data/runtime/cj-foodville-coffeechat-prep.md"
SOURCE_DIR="$TASK_ROOT/data/source/cj-foodville-sites"
PROMPT_FILE="$SKILL_DIR/references/coffeechat-review-prompt.md"
STRATEGY_NOTE="$TASK_ROOT/docs/prep/cj-foodville-coffeechat-strategy.md"
PROFILE="$TASK_ROOT/config/candidate-profile.md"
RAW_RESULT_JSON="$OUTDIR/claude.result.json"
INPUT_NOTE="$OUTDIR/input.md"
REPORT_MD="$OUTDIR/report.md"
mkdir -p "$OUTDIR" "$TASK_ROOT/data/runtime" "$SOURCE_DIR"

set +e
python3 "$SKILL_DIR/scripts/collect_foodville_sites.py" "$SOURCE_DIR" > "$OUTDIR/site-collection.json"
collect_code=$?
set -e
if (( collect_code != 0 )); then
  echo "[foodville-coffeechat] site collection had partial failures; continuing with available snapshots" >&2
fi

cat > "$INPUT_NOTE" <<EOF2
$(cat "$PROMPT_FILE")

후보자 프로필:
$(if [[ -f "$PROFILE" ]]; then cat "$PROFILE"; else echo "프로필 파일 없음: $PROFILE"; fi)

기존 커피챗 전략 노트:
$(if [[ -f "$STRATEGY_NOTE" ]]; then cat "$STRATEGY_NOTE"; else echo "전략 노트 없음: $STRATEGY_NOTE"; fi)

추가 사용자 맥락:
${FOODVILLE_CONTEXT:-없음}

사이트 수집 manifest:
$(cat "$SOURCE_DIR/manifest.json" 2>/dev/null || echo "manifest 없음")

VIPS 사이트 스냅샷:
$(cat "$SOURCE_DIR/vips.txt" 2>/dev/null || echo "수집 실패")

제일제면소 메뉴 사이트 스냅샷:
$(cat "$SOURCE_DIR/cheiljemyunso-menu.txt" 2>/dev/null || echo "수집 실패")

CJ푸드빌 브랜드 소개 사이트 스냅샷:
$(cat "$SOURCE_DIR/cjfoodville-brand.txt" 2>/dev/null || echo "수집 실패")

공개 검색 스니펫 보강 자료:
$(cat "$SOURCE_DIR/search-snippets.md" 2>/dev/null || echo "보강 자료 없음")
EOF2

rm -f "$RAW_RESULT_JSON"
timeout 900s claude --permission-mode bypassPermissions --print \
  --output-format json \
  --no-session-persistence \
  "$(cat "$INPUT_NOTE")" \
  > "$RAW_RESULT_JSON"

bun run "$HOME/ai-nodes/_shared/lib/invoke_claude_skills.ts" extract \
  "$RAW_RESULT_JSON" "$REPORT_MD" "${TRACK_TASK_CLAUDE_USAGE_FILE:-}"

bun run "$HOME/ai-nodes/_shared/lib/invoke_claude_skills.ts" persist-usage "$RAW_RESULT_JSON"

cp "$REPORT_MD" "$RUNTIME_OUT"
cat "$RUNTIME_OUT"
