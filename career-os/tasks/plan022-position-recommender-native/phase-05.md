# Phase 5 — 정적 검증 + push + trailing + index.json completed

**Model**: sonnet
**Status**: pending

---

## 목표

plan022 누적 결과 정적 검증. 모든 commit push + index.json status=completed + trailing.

## 사전 검증

```bash
cd /home/bifos/ai-nodes

git log -1 --format='%s' | grep -q "plan022 phase-04" \
  || { echo "PHASE_BLOCKED: phase-04 commit 없음"; exit 2; }

[ "$(git branch --show-current)" = "main" ] \
  || { echo "PHASE_BLOCKED: branch != main"; exit 2; }

echo "사전 검증 OK"
```

## 작업 항목

### 1. 정적 검증

```bash
cd /home/bifos/ai-nodes

# A. 옛 활성 자산 잔재 0
for kw in "run_position_recommendation\.sh" "extract_position_report\.ts" \
          "publish_job_analysis\.sh" "collect_live_postings\.py"; do
  HITS=$(grep -rln "$kw" career-os/.claude/skills/ career-os/scripts/ _shared/ 2>/dev/null | wc -l)
  [ "$HITS" = "0" ] || { echo "PHASE_FAILED: '$kw' 잔재 $HITS"; exit 1; }
done
echo "[A] 옛 자산 잔재 0 OK"

# B. dispatcher case 0개 (마지막 case 폐기)
bash -n career-os/scripts/command-router/run_now.sh \
  || { echo "PHASE_FAILED: dispatcher bash syntax"; exit 1; }
CASES=$(grep -cE "^\s*[a-z-]+\)" career-os/scripts/command-router/run_now.sh)
[ "$CASES" = "0" ] || { echo "PHASE_FAILED: dispatcher case 수 $CASES (expected 0)"; exit 1; }
echo "[B] dispatcher case 0개 OK"

# C. SKILL.md 필수 섹션 + 3 티어
SKILL=career-os/.claude/skills/position-recommender/SKILL.md
test -f "$SKILL" || { echo "PHASE_FAILED: SKILL.md 부재"; exit 1; }
for s in "When to use" "Inputs" "Workflow" "Self-check" "Error handling" \
         "강력 추천" "도전 추천" "보류"; do
  grep -q "$s" "$SKILL" || { echo "PHASE_FAILED: '$s' 누락"; exit 1; }
done
echo "[C] SKILL.md 검증 OK"

# D. tsc 통과
bunx tsc --noEmit 2>&1 | tee /tmp/plan022-phase05-tsc.log
[ "${PIPESTATUS[0]}" -eq 0 ] || { echo "PHASE_FAILED: tsc"; cat /tmp/plan022-phase05-tsc.log; exit 1; }
echo "[D] tsc OK"

# E. ts collector 존재 + executable 가능
test -f career-os/scripts/position-recommender/collect_live_postings.ts \
  || { echo "PHASE_FAILED: ts collector 부재"; exit 1; }
echo "[E] ts collector 존재 OK"

# F. 옛 subprocess 지시문 잔재 0 (6-7)
for kw in "Output only valid JSON" "Do not output markdown" "claude --json-schema"; do
  HITS=$(grep -rln "$kw" career-os/.claude/skills/position-recommender/ 2>/dev/null | wc -l)
  [ "$HITS" = "0" ] || { echo "PHASE_FAILED: '$kw' 잔재"; exit 1; }
done
echo "[F] 6-7 잔재 0 OK"

# G. 옛 env 패턴 잔재 0 (POSITION_CONTEXT= / POSITION_POSTINGS_FILE= shell 할당 패턴)
HITS=$(grep -rE "POSITION_CONTEXT=|POSITION_POSTINGS_FILE=" career-os/.claude/skills/position-recommender/ 2>/dev/null | wc -l)
[ "$HITS" = "0" ] || { echo "PHASE_FAILED: 옛 env 할당 패턴 잔재"; exit 1; }
echo "[G] 옛 env 패턴 잔재 0 OK"

# H. docs 갱신 + AGENTS.md
for d in prd flow code-architecture; do
  grep -qE "/position-recommender|position-recommender.*native" "career-os/docs/$d.md" \
    || { echo "PHASE_FAILED: docs/$d.md 갱신 누락"; exit 1; }
done
grep -q "/position-recommender" career-os/AGENTS.md \
  || { echo "PHASE_FAILED: AGENTS.md 갱신 누락"; exit 1; }
echo "[H] docs 갱신 OK"

# I. plan022 phase commit history
PLAN_COMMITS=$(git log --oneline | grep -c "plan022 phase-")
[ "$PLAN_COMMITS" -ge 4 ] || { echo "PHASE_FAILED: plan022 commit $PLAN_COMMITS (expected ≥4)"; exit 1; }
echo "[I] commit history OK"

echo "=== 정적 검증 전부 통과 ==="
```

### 2. index.json status=completed

```bash
cd /home/bifos/ai-nodes
python3 - <<'PY'
import json
from pathlib import Path
p = Path("career-os/tasks/plan022-position-recommender-native/index.json")
d = json.loads(p.read_text(encoding="utf-8"))
d["status"] = "completed"
d["current_phase"] = 5
for ph in d["phases"]:
    ph["status"] = "completed"
p.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("[index.json] completed")
PY
```

### 3. 최종 commit + push

```bash
cd /home/bifos/ai-nodes
HEAD_BEFORE=$(git rev-parse HEAD)

git add career-os/tasks/plan022-position-recommender-native/index.json

git commit -m "$(cat <<'COMMIT_EOF'
task(career-os): plan022 index.json status=completed (phase-05)

plan022 단계 1~5 통과:
- phase-01: SKILL.md + collect_live_postings.ts draft
- phase-02: ts 마이그 적용 + 동등성 검증 + Python 폐기
- phase-03: SKILL.md Write + 옛 자산 3개 폐기 + dispatcher 마지막 case 폐기
- phase-04: 5문서 + AGENTS.md 갱신
- phase-05: 정적 검증 9 항목 통과

정적 검증:
- 옛 자산 (run_position_recommendation.sh / extract_position_report.ts /
  publish_job_analysis.sh / collect_live_postings.py) 잔재 0
- dispatcher case 0개 (마지막 case 폐기)
- SKILL.md 필수 섹션 + 3 티어
- tsc 통과
- ts collector 존재
- 옛 subprocess 지시문 + env 패턴 잔재 0
- docs + AGENTS.md 갱신
- plan022 phase commit ≥4

native 진입점 누적 7개. dispatcher case 0개 — plan023에서 command-router
디렉터리 자체 폐기 가능.
COMMIT_EOF
)" || { echo "PHASE_FAILED: commit"; exit 1; }

HEAD_AFTER=$(git rev-parse HEAD)
COMMITS=$(git rev-list "$HEAD_BEFORE..$HEAD_AFTER" --count)
[ "$COMMITS" = "1" ] || { echo "PHASE_FAILED: commit 수 $COMMITS"; exit 1; }

git push origin main || { echo "PHASE_FAILED: push"; exit 1; }
echo "[3] commit + push OK"
```

### 4. trailing cleanup

```bash
cd /home/bifos/ai-nodes
if [ -n "$(git status --porcelain career-os/tasks/plan022-position-recommender-native/index.json)" ]; then
  git add career-os/tasks/plan022-position-recommender-native/index.json
  git commit -m "task(career-os): plan022 index.json commitSha 후기록"
  git push origin main
fi

DIRTY=$(git status --porcelain career-os/tasks/plan022-position-recommender-native/ | wc -l)
[ "$DIRTY" = "0" ] || { echo "PHASE_FAILED: trailing dirty"; exit 1; }
echo "trailing cleanup OK"
```

## 사용자 직접 처리 안내 (phase 외)

```bash
# 첫 실행
claude -p "/position-recommender"                              # 기본
claude -p "/position-recommender AI 서비스 백엔드 위주"        # 자연어 컨텍스트
claude -p "/position-recommender Wanted/Toss 최신 채용 포함"   # ts collector 호출 유도

# 산출물
cat career-os/data/runtime/position-recommendation.md
ls career-os/data/reports/daily/<오늘>/position-recommendation/
```

## Blocked 조건

- phase-04 commit 없음 → `PHASE_BLOCKED` + `exit 2`
- branch != main → `PHASE_BLOCKED` + `exit 2`
- 정적 검증 A~I 실패 → `PHASE_FAILED` + `exit 1`
- commit 수 ≠ 1 → `PHASE_FAILED` + `exit 1`
- push 실패 → `PHASE_FAILED` + `exit 1`
- trailing dirty → `PHASE_FAILED` + `exit 1`

## 의도 메모

- *dispatcher case 0개*는 plan023 (command-router 디렉터리 자체 폐기) 트리거 조건. 본 phase에서 명확히 도달 확인.
