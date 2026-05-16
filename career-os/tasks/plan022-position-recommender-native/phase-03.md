# Phase 3 — SKILL.md Write + 옛 자산 일괄 폐기 + dispatcher case 폐기

**Model**: sonnet
**Status**: pending

---

## 목표

phase-01 draft의 SKILL.md를 native 위치에 Write 적용. 옛 활성 자산 4개 일괄 폐기 (run_position_recommendation.sh + extract_position_report.ts + publish_job_analysis.sh). dispatcher recommend-positions case 폐기 — **마지막 남은 case → command-router 디렉터리 자체 폐기는 plan023**.

## 사전 검증

```bash
cd /home/bifos/ai-nodes

# phase-02 commit
git log -1 --format='%s' | grep -q "plan022 phase-02" \
  || { echo "PHASE_BLOCKED: phase-02 commit 없음"; exit 2; }

# ts collector 적용됨
test -f career-os/scripts/position-recommender/collect_live_postings.ts \
  || { echo "PHASE_BLOCKED: ts collector 부재 — phase-02 미완"; exit 2; }

# 폐기 대상 존재 (부분 실행 의심)
for f in run_position_recommendation.sh extract_position_report.ts publish_job_analysis.sh; do
  test -f "career-os/scripts/position-recommender/$f" \
    || { echo "PHASE_BLOCKED: $f 이미 부재"; exit 2; }
done

# dispatcher case 존재
grep -qE "^\s*recommend-positions\)" career-os/scripts/command-router/run_now.sh \
  || { echo "PHASE_BLOCKED: dispatcher case 이미 부재"; exit 2; }

# draft SKILL.md
DRAFT=career-os/tasks/plan022-position-recommender-native/draft/SKILL.md
test -f "$DRAFT" || { echo "PHASE_BLOCKED: draft SKILL.md 부재"; exit 2; }

echo "사전 검증 OK"
```

## 작업 항목

### 1. SKILL.md Write

`Read` draft + `Write`로 `career-os/.claude/skills/position-recommender/SKILL.md`에 덮어쓰기.

```bash
cd /home/bifos/ai-nodes
TARGET=career-os/.claude/skills/position-recommender/SKILL.md
DRAFT=career-os/tasks/plan022-position-recommender-native/draft/SKILL.md

# byte-for-byte 동일
diff -q "$TARGET" "$DRAFT" > /dev/null \
  || { echo "PHASE_FAILED: target ↔ draft 불일치"; exit 1; }

# 필수 섹션
for s in "When to use" "Inputs" "Workflow" "Self-check" "Error handling" \
         "position-recommender" "강력 추천" "도전 추천" "보류"; do
  grep -q "$s" "$TARGET" || { echo "PHASE_FAILED: '$s' 누락"; exit 1; }
done

# 옛 env 패턴 잔재 0 (자연어 흡수)
HITS=$(grep -cE "POSITION_CONTEXT=|POSITION_POSTINGS_FILE=" "$TARGET")
[ "$HITS" = "0" ] || { echo "PHASE_FAILED: 옛 env 패턴 잔재"; exit 1; }

# 옛 subprocess 지시문 없음 (6-7)
for kw in "Output only valid JSON" "Do not output markdown" "claude --json-schema"; do
  grep -q "$kw" "$TARGET" && { echo "PHASE_FAILED: '$kw' 잔재"; exit 1; }
done

echo "[1] SKILL.md Write OK"
```

### 2. 옛 자산 일괄 폐기

```bash
cd /home/bifos/ai-nodes
git rm career-os/scripts/position-recommender/run_position_recommendation.sh \
       career-os/scripts/position-recommender/extract_position_report.ts \
       career-os/scripts/position-recommender/publish_job_analysis.sh

# 검증
for f in run_position_recommendation.sh extract_position_report.ts publish_job_analysis.sh; do
  test ! -f "career-os/scripts/position-recommender/$f" \
    || { echo "PHASE_FAILED: $f 잔존"; exit 1; }
done
echo "[2] 옛 자산 3개 폐기 OK"
```

### 3. dispatcher recommend-positions case 폐기

Read로 `career-os/scripts/command-router/run_now.sh` 현재 본문 확인. Edit으로 `recommend-positions` case 블록 + usage line의 `recommend-positions` 제거.

```bash
cd /home/bifos/ai-nodes
# 검증
HITS=$(grep -cE "^\s*recommend-positions\)" career-os/scripts/command-router/run_now.sh)
[ "$HITS" = "0" ] || { echo "PHASE_FAILED: dispatcher case 잔존"; exit 1; }

# bash syntax
bash -n career-os/scripts/command-router/run_now.sh \
  || { echo "PHASE_FAILED: dispatcher bash syntax"; exit 1; }

# **case 0개** (마지막 case 폐기)
CASES=$(grep -cE "^\s*[a-z-]+\)" career-os/scripts/command-router/run_now.sh)
[ "$CASES" = "0" ] || { echo "PHASE_FAILED: dispatcher case 수 $CASES (expected 0)"; exit 1; }
echo "[3] dispatcher case 0개 OK — plan023에서 command-router 디렉터리 자체 폐기 가능"
```

### 4. 커밋 + commit 개수 강제

```bash
cd /home/bifos/ai-nodes
HEAD_BEFORE=$(git rev-parse HEAD)

git add career-os/.claude/skills/position-recommender/ \
        career-os/scripts/position-recommender/ \
        career-os/scripts/command-router/run_now.sh

git commit -m "$(cat <<'COMMIT_EOF'
refactor(career-os): position-recommender native + 옛 자산 일괄 폐기 + dispatcher 마지막 case 폐기 (plan022 phase-03)

ADR-030 적용. native skill 명세 적용 + 4 자산 폐기.

신규/갱신:
- .claude/skills/position-recommender/SKILL.md (~150줄): native 명세, 3 티어
  보고서 (강력/도전/보류), self-check 흡수 (옛 extract_position_report.ts
  검증 로직)

폐기:
- scripts/position-recommender/run_position_recommendation.sh (76줄)
- scripts/position-recommender/extract_position_report.ts (45줄,
  Claude self-check 흡수)
- scripts/position-recommender/publish_job_analysis.sh (110줄, 호출 0)
- dispatcher recommend-positions case (**마지막 남은 case**)

dispatcher case 1 → 0. plan023에서 command-router 디렉터리 자체 폐기 가능.

POSITION_CONTEXT + POSITION_POSTINGS_FILE env → 자연어 인자 흡수
(SKILL.md Workflow에 명시).
COMMIT_EOF
)" || { echo "PHASE_FAILED: commit"; exit 1; }

HEAD_AFTER=$(git rev-parse HEAD)
COMMITS=$(git rev-list "$HEAD_BEFORE..$HEAD_AFTER" --count)
[ "$COMMITS" = "1" ] || { echo "PHASE_FAILED: commit 수 $COMMITS"; exit 1; }
echo "[4] commit 1 OK"
```

## Critical Files

| 파일 | 변경 |
|---|---|
| `career-os/.claude/skills/position-recommender/SKILL.md` | Write 덮어쓰기 (draft 복제) |
| `career-os/scripts/position-recommender/run_position_recommendation.sh` | git rm |
| `career-os/scripts/position-recommender/extract_position_report.ts` | git rm |
| `career-os/scripts/position-recommender/publish_job_analysis.sh` | git rm |
| `career-os/scripts/command-router/run_now.sh` | recommend-positions case 제거 + usage 갱신 |

## Blocked 조건

- phase-02 commit 없음 → `PHASE_BLOCKED` + `exit 2`
- ts collector 부재 → `PHASE_BLOCKED: phase-02 미완` + `exit 2`
- 폐기 대상 부재 → `PHASE_BLOCKED: 부분 실행 의심` + `exit 2`
- 검증 1~3 실패 → `PHASE_FAILED` + `exit 1`
- dispatcher case ≠ 0 → `PHASE_FAILED` + `exit 1`
- commit 수 ≠ 1 → `PHASE_FAILED` + `exit 1`

## 의도 메모

- dispatcher case 0개 도달 — *command-router 존재 의미 사라짐*. plan023에서 디렉터리 자체 폐기.
- 옛 자산 3개 일괄 폐기 — 흐름 명확.
