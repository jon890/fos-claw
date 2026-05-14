#!/usr/bin/env bash
set -euo pipefail

TASK_ROOT="${TASK_ROOT:-$HOME/ai-nodes/career-os}"
REQUEST_TEXT="${1:-}"
[[ -z "$REQUEST_TEXT" ]] && { echo "usage: run_from_request.sh '<freeform study-pack request>'" >&2; exit 1; }

RESOLVER="$TASK_ROOT/scripts/fos-study-pack/resolve_freeform_study_pack.ts"
TOPICS_CFG="$TASK_ROOT/config/topics.json"
STUDY_RESOLVER="$TASK_ROOT/scripts/study-pack-writer/resolve_study_pack_topic.ts"
TEMP_CONFIG="$TASK_ROOT/data/runtime/freeform-study-pack-topic.json"

RESOLUTION_JSON="$("$RESOLVER" "$TOPICS_CFG" "$REQUEST_TEXT")"
MODE="$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['mode'])" "$RESOLUTION_JSON")"
TOPIC="$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['topic'])" "$RESOLUTION_JSON")"

if [[ "$MODE" == "unresolved" ]]; then
  mkdir -p "$(dirname "$TEMP_CONFIG")"
  python3 - "$RESOLUTION_JSON" "$TEMP_CONFIG" <<'PY'
import json,sys
from pathlib import Path
res=json.loads(sys.argv[1])
req=res.get('requestedText') or res.get('topic') or 'custom study pack'
slug=res['topic']
Path(sys.argv[2]).write_text(json.dumps({slug:{"domain":"custom","outputPath":f"custom/{slug}.md","commitTopic":slug,"appendPrompt":f"다음 자유 주제를 백엔드 면접 대비용 스터디팩으로 정리한다: {req}. 단순 요약이 아니라 개념, 실무 관점, 흔한 오해, 예시, 면접 답변 포인트까지 포함한다. 기존 문서와 겹치면 중복 설명을 줄이고 링크로 연결한다. 문서 제목은 반드시 [초안]으로 시작한다."}},ensure_ascii=False,indent=2))
PY
  TOPICS_CFG="$TEMP_CONFIG"
elif [[ "$MODE" != "study-pack" ]]; then
  echo "unsupported resolution mode: $MODE" >&2
  exit 2
fi

eval "$("$STUDY_RESOLVER" "$TOPICS_CFG" "$TOPIC")"
exec bun run "$HOME/ai-nodes/_shared/lib/study_pack_publish.ts"
