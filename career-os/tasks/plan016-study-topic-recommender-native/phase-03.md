# Phase 3 — SKILL.md native 명세 Write + dispatcher 3 case 폐기 + live-coding seed 흡수

**Model**: sonnet
**Status**: pending

---

## 목표

phase-01 draft의 SKILL.md를 study-topic-recommender의 native 명세로 Write 적용. dispatcher의 `recommend-topics` + `live-coding-dispatch` case 폐기 (`replenish-topics`는 plan015에서 이미 폐기). live-coding seed pool 의도를 SKILL.md 안으로 흡수.

**범위 외**: docs 갱신 (phase-04), 정적 검증·push·trailing (phase-04).

## 관련 docs (실행 전 필수 읽기)

- phase-02 commit — ts 마이그 + Python 폐기 완료
- `career-os/.claude/skills/study-topic-recommender/SKILL.md` (현재 35줄, 옛 사람용 — 덮어쓰기 대상)
- `career-os/tasks/plan016-study-topic-recommender-native/draft/SKILL.md` (native 명세 draft)
- `skills/plan-and-build/references/common-pitfalls.md` 6-6 (Write 위장 회피)

## 사전 검증

```bash
cd /home/bifos/ai-nodes

# 1-A. phase-02 commit 존재
git log -1 --format='%s' | grep -q "plan016 phase-02" \
  || { echo "PHASE_BLOCKED: phase-02 commit 없음"; exit 2; }

# 1-B. ts script 존재 (phase-02 결과)
test -f career-os/scripts/study-topic-recommender/refresh_topic_inventory.ts \
  || { echo "PHASE_BLOCKED: phase-02 미완 — ts script 없음"; exit 2; }

# 1-C. SKILL.md draft 존재
DRAFT=career-os/tasks/plan016-study-topic-recommender-native/draft/SKILL.md
test -f "$DRAFT" || { echo "PHASE_BLOCKED: draft SKILL.md 부재"; exit 2; }

# 1-D. dispatcher 현재 case 매핑
grep -nE "^\s*(recommend-topics|live-coding-dispatch)\)" career-os/scripts/command-router/run_now.sh \
  || { echo "PHASE_BLOCKED: dispatcher case 이미 없음 — 부분 실행 의심"; exit 2; }
echo "사전 검증 OK"
```

## 작업 항목

### 1. SKILL.md Write (draft → target, 전체 덮어쓰기)

`Read` 도구로 `career-os/tasks/plan016-study-topic-recommender-native/draft/SKILL.md` 로드.

`Write` 도구로 `career-os/.claude/skills/study-topic-recommender/SKILL.md`에 **draft 본문 그대로** 저장 (Edit 부분 수정 금지 — common-pitfalls 6-5 회피).

**주의**: 반드시 Write 도구 1회 호출. prose 응답으로 "다음과 같이 작성했다"식 위장 금지 (common-pitfalls 6-6).

### 2. SKILL.md 적용 검증

```bash
cd /home/bifos/ai-nodes
TARGET=career-os/.claude/skills/study-topic-recommender/SKILL.md
DRAFT=career-os/tasks/plan016-study-topic-recommender-native/draft/SKILL.md

# A. 라인 수 ≥120 (~150 draft 동등 크기)
LINES=$(wc -l < "$TARGET")
[ "$LINES" -ge 120 ] || { echo "PHASE_FAILED: target $LINES 줄 (expected ≥120) — Write 누락 의심"; exit 1; }

# B. target ↔ draft byte-for-byte 동일
diff -q "$TARGET" "$DRAFT" > /dev/null \
  || { echo "PHASE_FAILED: target ↔ draft 내용 불일치"; exit 1; }

# C. native 키워드 + 흡수 의도 명시
for kw in "When to use" "Inputs" "Workflow" "Self-check" "Error handling" "promote" "replenish" "live-coding"; do
  grep -q "$kw" "$TARGET" || { echo "PHASE_FAILED: 키워드 '$kw' 누락"; exit 1; }
done

# D. native invoke 안내
grep -q "claude -p\|/study-topic-recommender" "$TARGET" \
  || { echo "PHASE_FAILED: native invoke 안내 누락"; exit 1; }

echo "[1-D] SKILL.md 적용 + 검증 OK ($LINES 줄)"
```

### 3. dispatcher case 폐기 (`recommend-topics` + `live-coding-dispatch`)

Read로 `career-os/scripts/command-router/run_now.sh` 현재 본문 확인. 두 case 블록 Edit으로 제거.

```bash
cd /home/bifos/ai-nodes
echo "=== 폐기 대상 dispatcher case ==="
grep -nE "^\s*(recommend-topics|live-coding-dispatch)\)" career-os/scripts/command-router/run_now.sh
```

Edit으로 두 case 블록 + usage 라인의 두 명령 제거. 다른 case는 그대로.

검증:
```bash
cd /home/bifos/ai-nodes
# A. 두 case 제거
for c in "recommend-topics" "live-coding-dispatch"; do
  HITS=$(grep -cE "^\s*$c\)" career-os/scripts/command-router/run_now.sh)
  [ "$HITS" = "0" ] || { echo "PHASE_FAILED: dispatcher $c case 잔존"; exit 1; }
done

# B. bash syntax
bash -n career-os/scripts/command-router/run_now.sh \
  || { echo "PHASE_FAILED: dispatcher bash syntax"; exit 1; }

# C. case 총 수 (study-topic-recommender 폐기 + 이미 폐기된 것 고려해서 5개)
CASES=$(grep -cE "^\s*[a-z-]+\)" career-os/scripts/command-router/run_now.sh)
[ "$CASES" = "5" ] || { echo "PHASE_FAILED: dispatcher case 수 $CASES (expected 5)"; exit 1; }

echo "[3] dispatcher 정리 OK ($CASES case)"
```

### 4. live-coding seed pool 의도 흡수 명시

기존 config 파일 (`career-os/config/live-coding-seed-pool.json` + `live-coding-seed-candidates.json`)은 **유지** — SKILL.md가 Read해서 사용.

`run_live_coding_dispatch.sh`는 dispatcher case 폐기로 무용 — git rm:

```bash
cd /home/bifos/ai-nodes
git rm career-os/scripts/study-topic-recommender/run_live_coding_dispatch.sh
git rm career-os/scripts/study-topic-recommender/run_topic_recommendation.sh

# 검증: scripts 디렉터리에 ts 2개만 남아 있어야
REMAINING=$(ls career-os/scripts/study-topic-recommender/ | grep -v __pycache__ | wc -l)
[ "$REMAINING" -le 2 ] || { echo "PHASE_FAILED: scripts 디렉터리 $REMAINING 파일 잔존 (expected ≤2)"; ls career-os/scripts/study-topic-recommender/; exit 1; }
echo "[4] 옛 shell runner 폐기 OK"
```

### 5. 커밋 + commit 개수 강제

```bash
cd /home/bifos/ai-nodes
HEAD_BEFORE=$(git rev-parse HEAD)

git add career-os/.claude/skills/study-topic-recommender/SKILL.md \
        career-os/scripts/command-router/run_now.sh \
        career-os/scripts/study-topic-recommender/

git commit -m "$(cat <<'COMMIT_EOF'
refactor(career-os): study-topic-recommender SKILL.md native 명세 + dispatcher 2 case 폐기 + live-coding seed 흡수 (plan016 phase-03)

ADR-026 적용. plan013-2 / plan015 패턴 따라 draft 별도 파일에서
Read → Write target.

변경:
- .claude/skills/study-topic-recommender/SKILL.md: 옛 사람용 35줄 →
  native 명세 ~150줄 (Bash로 ts 호출 + Claude 자연어 hybrid)
- scripts/command-router/run_now.sh: recommend-topics + live-coding-dispatch
  case 폐기 + usage 갱신 (replenish-topics는 plan015에서 폐기됨)
- scripts/study-topic-recommender/: run_topic_recommendation.sh +
  run_live_coding_dispatch.sh 폐기 (native invoke로 대체)

config/live-coding-seed-pool.json + live-coding-seed-candidates.json은
유지 — SKILL.md가 직접 Read해서 자연어 "live-coding 1개 골라줘" 요청
시 1 선택 → study-pack-writer 위임 안내.

dispatcher case 7 → 5개.
COMMIT_EOF
)" || { echo "PHASE_FAILED: commit"; exit 1; }

HEAD_AFTER=$(git rev-parse HEAD)
COMMITS=$(git rev-list "$HEAD_BEFORE..$HEAD_AFTER" --count)
[ "$COMMITS" = "1" ] \
  || { echo "PHASE_FAILED: 본 phase commit 수 $COMMITS (expected 1)"; exit 1; }
echo "[5] commit 1개 OK"
```

## Critical Files

| 파일 | 변경 |
|---|---|
| `career-os/.claude/skills/study-topic-recommender/SKILL.md` | Write 전체 덮어쓰기 (draft 복제) |
| `career-os/scripts/command-router/run_now.sh` | recommend-topics + live-coding-dispatch case 제거 + usage 갱신 |
| `career-os/scripts/study-topic-recommender/run_topic_recommendation.sh` | git rm |
| `career-os/scripts/study-topic-recommender/run_live_coding_dispatch.sh` | git rm |

`config/live-coding-seed-pool.json` + `seed-candidates.json`는 유지.

## Blocked 조건

- phase-02 commit 없음 → `PHASE_BLOCKED` + `exit 2`
- ts script 부재 → `PHASE_BLOCKED: phase-02 미완` + `exit 2`
- draft SKILL.md 부재 → `PHASE_BLOCKED` + `exit 2`
- dispatcher case 이미 부재 → `PHASE_BLOCKED: 부분 실행 의심` + `exit 2`
- 검증 1-A~D / 3-A~C / 4 실패 → `PHASE_FAILED: <항목>` + `exit 1`
- commit 수 ≠ 1 → `PHASE_FAILED: commit 위장 의심` + `exit 1`

## 의도 메모

- SKILL.md Write 직후 *byte-for-byte diff*가 6-6 방어선 — Write 위장 즉시 잡힘.
- dispatcher 2 case 폐기 + run_*.sh 2개 폐기 묶음 — 한 commit으로 atomic.
- live-coding-seed-pool.json 자체는 *데이터 유지* (SKILL.md가 Read).
