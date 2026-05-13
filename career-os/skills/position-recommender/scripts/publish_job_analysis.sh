#!/usr/bin/env bash
set -euo pipefail

TASK_ROOT="${TASK_ROOT:-$HOME/ai-nodes/career-os}"
SOURCE_DIR="$TASK_ROOT/sources/fos-study"
SLUG="${1:?usage: publish_job_analysis.sh <slug> <title> <analysis-md> [service-landscape-md]}"
TITLE="${2:?usage: publish_job_analysis.sh <slug> <title> <analysis-md> [service-landscape-md]}"
ANALYSIS_MD="${3:?usage: publish_job_analysis.sh <slug> <title> <analysis-md> [service-landscape-md]}"
SERVICE_MD="${4:-}"
OUT_REL="interview/${SLUG}.md"
OUT_MD="$SOURCE_DIR/$OUT_REL"

if [[ ! -f "$ANALYSIS_MD" ]]; then
  echo "analysis file not found: $ANALYSIS_MD" >&2
  exit 1
fi
if [[ -n "$SERVICE_MD" && ! -f "$SERVICE_MD" ]]; then
  echo "service landscape file not found: $SERVICE_MD" >&2
  exit 1
fi

if [[ ! -d "$SOURCE_DIR/.git" ]]; then
  git clone --depth=1 https://github.com/jon890/fos-study.git "$SOURCE_DIR"
else
  git -C "$SOURCE_DIR" pull --ff-only
fi

mkdir -p "$(dirname "$OUT_MD")"
python3 - <<'PY' "$TITLE" "$ANALYSIS_MD" "$SERVICE_MD" "$OUT_MD"
from pathlib import Path
import re
import sys

title, analysis_path, service_path, out_path = sys.argv[1:]

def read_body(path: str) -> str:
    text = Path(path).read_text(encoding='utf-8').strip()
    lines = text.splitlines()
    # Drop the first H1 from runtime files and keep body sections.
    if lines and lines[0].startswith('# '):
        lines = lines[1:]
        while lines and not lines[0].strip():
            lines = lines[1:]
    return '\n'.join(lines).strip()

def escape_tilde_ranges(content: str) -> str:
    out = []
    in_fence = False
    inline = False
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
                inline = not inline
                chars.append(ch)
            elif ch == '~' and not inline:
                if i > 0 and line[i - 1] == '\\':
                    chars.append(ch)
                else:
                    chars.append('\\~')
            else:
                chars.append(ch)
        out.append(''.join(chars))
    return '\n'.join(out)

parts = [
    f"# [초안] {title}",
    "",
    "> 이 문서는 공개 채용공고와 공개 서비스 자료, 그리고 후보자 이력 기반 매칭을 바탕으로 정리한 지원 준비용 직무 분석이다.",
    "> 내부 비공개 정보나 확인되지 않은 성과 수치는 포함하지 않는다.",
    "",
    "## 분석 요약",
    "",
    read_body(analysis_path),
]
if service_path:
    parts.extend([
        "",
        "---",
        "",
        "## 서비스/브랜드 운영 파악",
        "",
        read_body(service_path),
    ])
content = escape_tilde_ranges('\n'.join(parts).rstrip() + '\n')
Path(out_path).write_text(content, encoding='utf-8')
print(out_path)
PY

if git -C "$SOURCE_DIR" ls-files --error-unmatch "$OUT_REL" >/dev/null 2>&1; then
  ACTION="update"
  if git -C "$SOURCE_DIR" diff --quiet -- "$OUT_REL"; then
    echo "No content change detected for $OUT_REL"
    exit 0
  fi
else
  ACTION="add"
fi

git -C "$SOURCE_DIR" add "$OUT_REL"
git -C "$SOURCE_DIR" commit -m "docs(interview): ${ACTION} ${SLUG} job analysis"
git -C "$SOURCE_DIR" push origin HEAD
HASH="$(git -C "$SOURCE_DIR" rev-parse --short HEAD)"
echo "Published job analysis: $OUT_REL ($HASH)"
