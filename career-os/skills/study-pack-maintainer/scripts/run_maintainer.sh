#!/usr/bin/env bash
set -euo pipefail
# Executed via bash or direct exec from track_task.sh.

TASK_ROOT="${TASK_ROOT:-$HOME/ai-nodes/career-os}"
SOURCE_DIR="$TASK_ROOT/sources/fos-study"
TOPIC="${MAINTAINER_TOPIC:?MAINTAINER_TOPIC is required}"
REQUESTED_TOPIC="${REQUESTED_TOPIC:?REQUESTED_TOPIC is required}"
CANDIDATE_FILES_JSON="${CANDIDATE_FILES_JSON:?CANDIDATE_FILES_JSON is required}"
PREFERRED_DOMAIN="${PREFERRED_DOMAIN:-interview}"
OUTDIR="$TASK_ROOT/data/reports/daily/${REPORT_DATE:-$(date +%F)}/maintainer-$TOPIC"
PROMPT_FILE="$TASK_ROOT/skills/study-pack-maintainer/references/maintainer-prompt.md"
MAINTENANCE_RULES_FILE="$TASK_ROOT/skills/study-pack-maintainer/references/fos-study-maintenance-rules.md"
INPUT_NOTE="$OUTDIR/analysis-input.md"
RAW_RESULT_JSON="$OUTDIR/claude.result.json"
PARSED_JSON="$OUTDIR/parsed.json"

mkdir -p "$OUTDIR"

if [[ ! -d "$SOURCE_DIR/.git" ]]; then
  git clone --depth=1 https://github.com/jon890/fos-study.git "$SOURCE_DIR"
else
  git -C "$SOURCE_DIR" pull --ff-only
fi

python3 - "$TASK_ROOT" "$PROMPT_FILE" "$MAINTENANCE_RULES_FILE" "$REQUESTED_TOPIC" "$CANDIDATE_FILES_JSON" "$INPUT_NOTE" <<'PY'
import json
import sys
from pathlib import Path

root = Path(sys.argv[1])
prompt_file = Path(sys.argv[2])
maintenance_rules_file = Path(sys.argv[3])
requested_topic = sys.argv[4]
candidate_files = json.loads(sys.argv[5])
input_note = Path(sys.argv[6])

parts = [
    prompt_file.read_text(encoding='utf-8').strip(),
    '',
    '다음 유지보수/연결 규칙을 함께 따른다:',
    maintenance_rules_file.read_text(encoding='utf-8').strip(),
    '',
    f'요청 주제: {requested_topic}',
    '',
    '검토 대상 기존 문서:'
]
for rel in candidate_files:
    p = root / 'sources' / 'fos-study' / rel
    parts.append(f'## FILE: {p}')
    if p.exists():
        parts.append(p.read_text(encoding='utf-8'))
    else:
        parts.append(f'[파일 없음: {rel}]')
    parts.append('')
input_note.write_text('\n'.join(parts).strip() + '\n', encoding='utf-8')
PY

run_once() {
  rm -f "$RAW_RESULT_JSON"
  local code=0
  timeout 900s claude --permission-mode bypassPermissions --print \
    --output-format json \
    --no-session-persistence \
    "$(cat "$INPUT_NOTE")" > "$RAW_RESULT_JSON" || code=$?
  if (( code != 0 )); then
    echo "maintainer claude CLI failed or timed out (exit ${code}) for ${TOPIC}" >&2
    return "$code"
  fi
  if [[ ! -s "$RAW_RESULT_JSON" ]]; then
    echo "maintainer claude CLI produced empty JSON envelope for ${TOPIC}" >&2
    return 1
  fi
  bun run "$HOME/ai-nodes/_shared/lib/invoke_claude_skills.ts" persist-usage "$RAW_RESULT_JSON"
}

parse_result() {
  python3 - "$RAW_RESULT_JSON" "$PARSED_JSON" <<'PY'
import json
import sys
from pathlib import Path

raw = Path(sys.argv[1]).read_text(encoding='utf-8', errors='replace').strip()
if not raw:
    raise SystemExit('maintainer validation failed: empty claude json envelope')
envelope = json.loads(raw)
result = envelope.get('result', '').strip()
if not result:
    raise SystemExit('maintainer validation failed: empty result field')

# Claude sometimes wraps the requested JSON object in a fenced ```json block even
# when the prompt says "valid JSON only". Treat that as recoverable, not fatal.
if result.startswith('```'):
    lines = result.splitlines()
    if lines and lines[0].lstrip().startswith('```'):
        lines = lines[1:]
    if lines and lines[-1].strip() == '```':
        lines = lines[:-1]
    result = '\n'.join(lines).strip()

data = json.loads(result)
required = ['action', 'outputPath', 'rationale', 'markdown']
for key in required:
    if key not in data:
        raise SystemExit(f'maintainer validation failed: missing key {key}')
if data['action'] not in ['update-existing', 'create-new', 'augment-existing', 'create-bridge']:
    raise SystemExit('maintainer validation failed: invalid action')
markdown = data['markdown'].strip()
if not markdown.startswith('#'):
    raise SystemExit('maintainer validation failed: markdown does not start with heading')

def validate_code_fence_languages(content: str) -> None:
    in_fence = False
    for line_no, line in enumerate(content.splitlines(), 1):
        stripped = line.lstrip()
        if not stripped.startswith('```'):
            continue
        if not in_fence:
            language = stripped[3:].strip()
            if not language:
                raise SystemExit(
                    'maintainer validation failed: code fence opened without language tag '
                    f'at line {line_no}'
                )
            in_fence = True
        else:
            in_fence = False

validate_code_fence_languages(markdown)

def escape_tilde_ranges(content: str) -> str:
    out = []
    in_fence = False
    inline_code = False
    for line in content.splitlines():
        if line.lstrip().startswith('```'):
            in_fence = not in_fence
            out.append(line)
            continue
        if in_fence:
            out.append(line)
            continue
        chars = []
        for i, ch in enumerate(line):
            if ch == '`':
                inline_code = not inline_code
                chars.append(ch)
            elif ch == '~' and not inline_code:
                if i > 0 and line[i - 1] == '\\':
                    chars.append(ch)
                else:
                    chars.append('\\~')
            else:
                chars.append(ch)
        out.append(''.join(chars))
    return '\n'.join(out)

data['markdown'] = escape_tilde_ranges(markdown)
if 'relatedFiles' not in data:
    data['relatedFiles'] = []
Path(sys.argv[2]).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
PY
}

if ! run_once || ! parse_result; then
  echo "First maintainer run failed for $TOPIC, retrying once with stricter JSON instructions..." >&2
  cat >> "$INPUT_NOTE" <<'EOF'

재시도 지시사항:
- 이전 응답은 파싱/검증에 실패했다.
- 응답 전체는 반드시 JSON object 하나여야 한다.
- ```json 코드펜스, 설명문, 요약문을 절대 쓰지 않는다.
- JSON 문자열 내부의 markdown만 `markdown` 필드에 넣는다.
- markdown 내부 코드블록은 반드시 언어 태그가 있는 fence로 연다. bare ```는 검증 실패다.
EOF
  run_once
  parse_result
fi

OUTPUT_REL_PATH="$(python3 - <<'PY' "$PARSED_JSON"
import json, sys
from pathlib import Path
print(json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))['outputPath'])
PY
)"
OUTPUT_MD="$SOURCE_DIR/$OUTPUT_REL_PATH"
mkdir -p "$(dirname "$OUTPUT_MD")"
python3 - <<'PY' "$PARSED_JSON" "$OUTPUT_MD"
import json, sys
from pathlib import Path
payload = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
Path(sys.argv[2]).write_text(payload['markdown'].rstrip() + '\n', encoding='utf-8')
PY

if git -C "$SOURCE_DIR" ls-files --error-unmatch "$OUTPUT_REL_PATH" >/dev/null 2>&1; then
  EFFECTIVE_ACTION="update"
  if git -C "$SOURCE_DIR" diff --quiet -- "$OUTPUT_REL_PATH"; then
    echo "No content change detected for $OUTPUT_REL_PATH"
    exit 0
  fi
else
  EFFECTIVE_ACTION="add"
fi

BASENAME="$(basename "$OUTPUT_REL_PATH" .md)"
COMMIT_MSG="docs(${PREFERRED_DOMAIN}): ${EFFECTIVE_ACTION} draft ${BASENAME} study pack"

git -C "$SOURCE_DIR" add "$OUTPUT_REL_PATH"
git -C "$SOURCE_DIR" commit -m "$COMMIT_MSG"
git -C "$SOURCE_DIR" push origin HEAD

COMMIT_HASH="$(git -C "$SOURCE_DIR" rev-parse HEAD)"
python3 "$HOME/ai-nodes/_shared/bin/update_artifacts.py" \
  "$TASK_ROOT/data/generated-artifacts.json" \
  "$TOPIC" "$OUTPUT_REL_PATH" "$COMMIT_HASH"

echo "Committed and pushed: $COMMIT_MSG ($COMMIT_HASH)"
