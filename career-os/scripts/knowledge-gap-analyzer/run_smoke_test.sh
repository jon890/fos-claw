#!/usr/bin/env bash
set -euo pipefail

TASK_ROOT="${TASK_ROOT:-$HOME/ai-nodes/career-os}"
DATE="${REPORT_DATE:-$(date +%F)}"
_MVP="$TASK_ROOT/config/mvp-target.json"
PRIMARY_COMPANY=$(python3 -c "import json; d=json.load(open('$_MVP')); print(d['primary']['company'])")
PRIMARY_ROLE=$(python3 -c "import json; d=json.load(open('$_MVP')); print(d['primary']['role'])")
OUTDIR="$TASK_ROOT/data/reports/baseline/$DATE/smoke-test"
PROFILE="$TASK_ROOT/config/candidate-profile.md"
PROMPT_FILE="$TASK_ROOT/skills/knowledge-gap-analyzer/references/baseline-prompt.md"
SOURCE_DIR="$TASK_ROOT/sources/fos-study"
TARGET_LIST="$OUTDIR/target-files.txt"
INPUT_NOTE="$OUTDIR/analysis-input.md"
REPORT_MD="$OUTDIR/report.md"
STDERR_LOG="$OUTDIR/claude.stderr.log"
STDOUT_LOG="$OUTDIR/claude.stdout.log"
CLAUDE_JSON="$OUTDIR/claude.result.json"
FALLBACK_MD="$OUTDIR/report.fallback.md"
mkdir -p "$OUTDIR"

cat > "$TARGET_LIST" <<EOF
database/index.md
database/mysql/transaction-lock.md
database/mysql/mysql-architecture.md
java/spring/jpa-transaction.md
architecture/distributed-transaction.md
EOF

cat > "$INPUT_NOTE" <<EOF
$(cat "$PROMPT_FILE")

다음 경로의 파일을 직접 읽고 분석한다:
- 지원자 프로필: $PROFILE
- 소스 레포지토리 루트: $SOURCE_DIR
- 대상 파일 목록: $TARGET_LIST

지시사항:
- target-files.txt 에 나열된 마크다운 파일만 읽는다.
- target-files.txt 의 파일 경로는 소스 레포지토리 루트 기준 상대 경로다.
- .claude/** 와 비-마크다운 파일은 무시한다.
- ${PRIMARY_COMPANY} ${PRIMARY_ROLE} 포지션 준비에 초점을 맞춘다.
- DB를 약점 가능성이 높은 영역으로 다루고, 스터디 노트가 이를 뒷받침하는지 검증한다.
- 최종 리포트는 한국어로 작성한다.
EOF

if timeout 300s claude --permission-mode bypassPermissions --print --output-format json "Read $INPUT_NOTE and complete the requested analysis. Write only the final markdown report." > "$CLAUDE_JSON" 2> "$STDERR_LOG"; then
  cp "$CLAUDE_JSON" "$STDOUT_LOG"
  bun run "$HOME/ai-nodes/_shared/lib/invoke_claude_skills.ts" extract \
    "$CLAUDE_JSON" "$REPORT_MD" "${TRACK_TASK_CLAUDE_USAGE_FILE:-}"
else
  cat > "$FALLBACK_MD" <<EOF
# ${PRIMARY_COMPANY} ${PRIMARY_ROLE} Prep Smoke Test Report

- Status: Claude synthesis failed, fallback report created
- Candidate profile: $PROFILE
- Source repository root: $SOURCE_DIR
- Target file list: $TARGET_LIST
- stderr log: $STDERR_LOG
EOF
  cp "$FALLBACK_MD" "$REPORT_MD"
fi

echo "Wrote: $TARGET_LIST"
echo "Wrote: $INPUT_NOTE"
echo "Wrote: $STDOUT_LOG"
echo "Wrote: $STDERR_LOG"
echo "Wrote: $CLAUDE_JSON"
echo "Wrote: $REPORT_MD"
