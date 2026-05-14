# Phase 3 — plan013 commitSha audit 노트 + plan013-2 status=completed + trailing cleanup

**Model**: sonnet
**Status**: pending

---

## 목표

plan013-2 마무리. 두 가지:

1. plan013 index.json에 phase-02/04 false commitSha audit 노트 추가 (history 보존 — 1차 실행 거짓 success가 어떻게 발생했는지 미래 reader가 알 수 있도록)
2. plan013-2 index.json status=completed 마킹 + EOL + trailing commit + push

**범위 외**: plan013 phase 본문 수정 (history 그대로 보존).

## 사전 검증

```bash
cd /home/bifos/ai-nodes

# 1-A. phase-02 commit이 history에 존재
LATEST=$(git log -3 --format='%H %s')
echo "$LATEST" | grep -q "plan013-2" \
  || { echo "PHASE_BLOCKED: plan013-2 commit 미발견"; exit 2; }
echo "[사전] plan013-2 commit OK"

# 1-B. target SKILL.md가 native 명세 (회복 완료 확인)
SKILL=career-os/.claude/skills/study-pack-writer/SKILL.md
LINES=$(wc -l < "$SKILL")
[ "$LINES" -ge 80 ] || { echo "PHASE_BLOCKED: SKILL.md $LINES 줄 — phase-01/02 미완"; exit 2; }
```

## 작업 항목

### 1. plan013 index.json에 audit 노트 추가

```bash
cd /home/bifos/ai-nodes
python3 - <<'PY'
import json
from pathlib import Path
p = Path("career-os/tasks/plan013-study-pack-writer-native/index.json")
data = json.loads(p.read_text(encoding="utf-8"))

# audit 노트 필드 추가 (phase 본문은 그대로 보존)
audit_note = (
    "1차 실행 false success 회복: phase-02 commitSha (850dcb18179b)는 "
    "plan011 폐기 commit이며 phase-02가 실제로 만든 commit이 아니다. "
    "phase-04 commitSha (d2ed962f0280)도 phase-03 commit과 동일 — "
    "phase-04도 자기 commit을 만들지 않음. 실제 SKILL.md 재작성은 "
    "plan013-2-skill-rewrite-redo에서 수행. common-pitfalls 6-6 참조."
)
data["audit_note"] = audit_note
data["audit_added_at"] = "2026-05-14"

p.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"[audit] plan013 index.json에 audit_note 추가")
PY
```

### 2. plan013-2 index.json status=completed

```bash
cd /home/bifos/ai-nodes
python3 - <<'PY'
import json
from pathlib import Path
p = Path("career-os/tasks/plan013-2-skill-rewrite-redo/index.json")
data = json.loads(p.read_text(encoding="utf-8"))
data["status"] = "completed"
data["current_phase"] = 3
for phase in data["phases"]:
    phase["status"] = "completed"
p.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("[index.json] plan013-2 marked completed")
PY
```

### 3. 최종 commit + push

```bash
cd /home/bifos/ai-nodes
git add career-os/tasks/plan013-study-pack-writer-native/index.json \
        career-os/tasks/plan013-2-skill-rewrite-redo/index.json

# commit 직전 HEAD 저장
HEAD_BEFORE=$(git rev-parse HEAD)

git commit -m "$(cat <<'COMMIT_EOF'
task(career-os): plan013-2 완료 마킹 + plan013 commitSha false 기록 audit 노트

plan013-2-skill-rewrite-redo 3 phase 완료:
- phase-01: draft → SKILL.md Write (실제로 적용됨, ≥80줄)
- phase-02: 정적 검증 7항목 통과 + push
- phase-03: audit 노트 + status 마킹

plan013 index.json엔 audit_note 필드 추가 — 1차 실행 phase-02/04
commitSha가 그 phase가 만든 commit이 아닌 직전 HEAD가 박힌 false history
임을 미래 reader가 인지 가능하게 보존.
COMMIT_EOF
)" || { echo "PHASE_FAILED: commit 실패"; exit 1; }

# commit 1개 강제 검증
HEAD_AFTER=$(git rev-parse HEAD)
COMMITS=$(git rev-list "$HEAD_BEFORE..$HEAD_AFTER" --count)
[ "$COMMITS" = "1" ] \
  || { echo "PHASE_FAILED: 본 phase commit 수 $COMMITS (expected 1)"; exit 1; }

git push origin main || { echo "PHASE_FAILED: push 실패"; exit 1; }
echo "[commit + push] 1 commit OK"
```

### 4. trailing cleanup

```bash
cd /home/bifos/ai-nodes
DIRTY=$(git status --porcelain career-os/tasks/plan013-2-skill-rewrite-redo/ career-os/tasks/plan013-study-pack-writer-native/ | wc -l)
if [ "$DIRTY" -gt 0 ]; then
  # run-phases.py 후기록 (commitSha 등) 정리
  git add career-os/tasks/plan013-2-skill-rewrite-redo/ career-os/tasks/plan013-study-pack-writer-native/
  git commit -m "task(career-os): plan013-2 index.json commitSha 후기록 + EOL 보정"
  git push origin main
fi

# 최종 dirty 0 확인
DIRTY_FINAL=$(git status --porcelain career-os/tasks/plan013-2-skill-rewrite-redo/ career-os/tasks/plan013-study-pack-writer-native/ | wc -l)
[ "$DIRTY_FINAL" = "0" ] \
  || { echo "PHASE_FAILED: trailing 후에도 plan013/plan013-2 경로 dirty"; git status --porcelain; exit 1; }
echo "trailing cleanup OK"
```

## Critical Files

| 파일 | 변경 |
|---|---|
| `career-os/tasks/plan013-study-pack-writer-native/index.json` | `audit_note` 필드 추가 |
| `career-os/tasks/plan013-2-skill-rewrite-redo/index.json` | status=completed 마킹 |

## Blocked 조건

- plan013-2 commit이 history에 없음 → `PHASE_BLOCKED: plan013-2 commit 미발견` + `exit 2`
- SKILL.md 라인 수 ≥80 미달 → `PHASE_BLOCKED: phase-01/02 미완` + `exit 2`
- commit 수 ≠ 1 → `PHASE_FAILED: commit 위장 의심` + `exit 1`
- push 실패 → `PHASE_FAILED: push` + `exit 1`
- trailing 후 dirty → `PHASE_FAILED: trailing 미완` + `exit 1`

## 의도 메모

- plan013 index.json은 phase 본문 변경 없이 audit_note 필드만 추가 — 1차 실행 history 그대로 보존하되, false commitSha의 의미를 미래 reader가 알 수 있게.
- plan013-2 마무리는 표준 패턴 (status=completed + EOL + trailing).
- commit 개수 검증 = common-pitfalls 6-6 방어선.
