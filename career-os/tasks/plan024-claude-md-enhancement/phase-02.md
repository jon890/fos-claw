# Phase 02 — 통합 정적 검증 + status=completed + push

**Model**: haiku
**Status**: pending

---

## 목표

plan024 산출물 통합 정적 검증 + index.json `status="completed"` 마킹 + `git push origin main`.

**범위 외**: 본문 갱신 (phase-01 완료).

---

## 본 phase 강제 주의문

- Bash 검증 명령은 실제 실행해야 함. prose 응답만으로는 PHASE_FAILED (common-pitfalls 6-4).
- 통합 검증 결과를 stdout에 raw value echo로 명시.
- section sigil (U+00A7) 사용 금지.

---

## 작업 항목

### 1. 통합 정적 검증

run-phases.py는 cwd=career-os로 phase 시작. 본 phase는 ai-nodes 루트 path 인용이라 첫 bash 블록에서 cwd=ai-nodes 루트로 변경 (Claude Code Bash 도구 cwd 보존 → 후속 자동 유지).

```bash
# cwd를 ai-nodes 루트로 변경 (모든 후속 bash 명령 ai-nodes 루트 기준)
cd "$(git rev-parse --show-toplevel)"
pwd  # 기대: /home/bifos/ai-nodes

SIGIL_CHAR=$(printf '\xc2\xa7')

# 1-A. career-os/AGENTS.md 핵심 보강 영역 검증
grep -q "workspace-structure.md" career-os/AGENTS.md || { echo "PHASE_FAILED: workspace-structure 링크 누락"; exit 1; }
grep -q "ADR-019" career-os/AGENTS.md || { echo "PHASE_FAILED: ADR-019 비대칭 누락"; exit 1; }
grep -q "plan-and-build" career-os/AGENTS.md || { echo "PHASE_FAILED: plan-and-build 안내 누락"; exit 1; }
grep -q "Bun runtime\|bun install" career-os/AGENTS.md || { echo "PHASE_FAILED: Bun runtime 누락"; exit 1; }
echo "[1-A 핵심 보강 영역] OK"

# 1-B. 워크플로 진입점 code block 7 native skill
SKILL_COUNT=$(grep -c "^claude.*-p.*\"/" career-os/AGENTS.md || echo 0)
echo "[1-B native skill code block lines] $SKILL_COUNT"
[ "$SKILL_COUNT" -ge 7 ] || { echo "PHASE_FAILED: native skill code block $SKILL_COUNT < 7"; exit 1; }

# 1-C. section sigil 미사용
COUNT=$(grep -c "$SIGIL_CHAR" career-os/AGENTS.md || echo 0)
echo "[1-C sigil count] $COUNT"
[ "$COUNT" -eq 0 ] || { echo "PHASE_FAILED: AGENTS.md sigil 잔재"; exit 1; }

# 1-D. CLAUDE.md 심링크 정합 (career-os는 기존부터 심링크 — 변경 없음)
test -L career-os/CLAUDE.md || { echo "PHASE_FAILED: CLAUDE.md not symlink"; exit 1; }
LINK_TARGET=$(readlink career-os/CLAUDE.md)
echo "[1-D CLAUDE.md target] $LINK_TARGET"
[ "$LINK_TARGET" = "AGENTS.md" ] || { echo "PHASE_FAILED: symlink target $LINK_TARGET != AGENTS.md"; exit 1; }

# 1-E. 분량 (140-220줄 범위)
LINES=$(wc -l < career-os/AGENTS.md)
echo "[1-E AGENTS.md] $LINES lines"
[ "$LINES" -ge 140 ] && [ "$LINES" -le 220 ] || { echo "PHASE_FAILED: $LINES 범위 (140-220) 밖"; exit 1; }

echo "=== 통합 정적 검증 통과 ==="
```

### 2. index.json status="completed" 마킹

```bash
python3 - <<'PY'
import json, pathlib
from datetime import datetime, timezone

p = pathlib.Path("career-os/tasks/plan024-claude-md-enhancement/index.json")
data = json.loads(p.read_text())
data["status"] = "completed"
data["updated_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00")
p.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
print(f"[index.json] status={data['status']} updated_at={data['updated_at']}")
PY
```

검증:

```bash
STATUS=$(python3 -c "import json; print(json.load(open('career-os/tasks/plan024-claude-md-enhancement/index.json'))['status'])")
echo "[plan024 status] $STATUS"
[ "$STATUS" = "completed" ] || { echo "PHASE_FAILED: status != completed"; exit 1; }
```

### 3. status commit + push

```bash
git add career-os/tasks/plan024-claude-md-enhancement/index.json
git commit -m "$(cat <<'EOF'
task(career-os): plan024 index.json status=completed (phase-02)

plan024 2 phase 모두 통과:
- phase-01: career-os/AGENTS.md /init 식 보강 (7 native skill code block + workspace-structure 링크 + plan-and-build cycle + Bun/claude CLI 외부 의존성)
- phase-02: 통합 정적 검증 + status=completed

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"

git push origin main
```

---

## 검증 (phase 종료 직전)

```bash
# 1. index.json status=completed
STATUS=$(python3 -c "import json; print(json.load(open('career-os/tasks/plan024-claude-md-enhancement/index.json'))['status'])")
echo "[plan024 status] $STATUS"
[ "$STATUS" = "completed" ] || { echo "PHASE_FAILED: status != completed"; exit 1; }

# 2. push 성공 확인 (HEAD == origin/main)
UNPUSHED=$(git log origin/main..HEAD --oneline | wc -l)
echo "[unpushed commits] $UNPUSHED"
[ "$UNPUSHED" -eq 0 ] || { echo "PHASE_FAILED: $UNPUSHED unpushed commits"; exit 1; }

echo "✓ Phase 02 검증 통과"
echo "✓ plan024 전체 완료 — push 됨"
```

---

## 의도 메모

- haiku 모델 — 기계적 검증 + JSON 마킹 + push.
- plan024는 작음 (2 phase) — career-os AGENTS.md /init 보강이 *기존 잘 정리된 본문에 부족 영역만 추가*라.
- workspace-structure.md 의존성 — apartment plan001 phase-03이 선행돼야 함 (depends_on 명시).
- 통합 검증은 phase-01 자체 검증과 거의 같지만 cross-check 목적.
