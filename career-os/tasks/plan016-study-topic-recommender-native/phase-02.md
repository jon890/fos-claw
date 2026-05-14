# Phase 2 — ts 마이그 적용 + 동등성 검증 + Python 폐기

**Model**: sonnet
**Status**: pending

---

## 목표

phase-01 draft에서 ts 파일 2개를 실제 위치(`career-os/scripts/study-topic-recommender/`)로 옮기고, Python 원본과 *결정론 동등 출력* 검증. 동등 확인 후 Python 폐기.

**범위 외**: SKILL.md 적용 (phase-03), dispatcher case 폐기 (phase-03), docs 갱신 (phase-04).

## 관련 docs (실행 전 필수 읽기)

- phase-01 commit — draft 3개 작성 완료
- `career-os/scripts/study-topic-recommender/refresh_topic_inventory.py` — 원본 (검증용)
- `skills/plan-and-build/references/common-pitfalls.md` 6-6

## 사전 검증

```bash
cd /home/bifos/ai-nodes

# 1-A. phase-01 commit 존재
git log -1 --format='%s' | grep -q "plan016 phase-01" \
  || { echo "PHASE_BLOCKED: phase-01 commit 없음"; exit 2; }

# 1-B. draft 3개 존재
DRAFT=career-os/tasks/plan016-study-topic-recommender-native/draft
for f in refresh_topic_inventory.ts feed_discovery.ts SKILL.md; do
  test -f "$DRAFT/$f" || { echo "PHASE_BLOCKED: draft/$f 부재"; exit 2; }
done

# 1-C. 원본 Python 살아있음
for f in refresh_topic_inventory.py feed_discovery.py; do
  test -f "career-os/scripts/study-topic-recommender/$f" \
    || { echo "PHASE_BLOCKED: 원본 $f 이미 없음 — 부분 실행 의심"; exit 2; }
done
echo "사전 검증 OK"
```

## 작업 항목

### 1. fast-xml-parser 의존 추가

```bash
cd /home/bifos/ai-nodes
# package.json에 fast-xml-parser 추가
bun add fast-xml-parser 2>&1 | tail -5
# 또는 npm 사용 시: npm install fast-xml-parser
[ -d node_modules/fast-xml-parser ] || { echo "PHASE_FAILED: fast-xml-parser 미설치"; exit 1; }
echo "[1] fast-xml-parser OK"
```

### 2. Python 원본 출력 캡처 (검증 baseline)

```bash
cd /home/bifos/ai-nodes
TASK_ROOT=/home/bifos/ai-nodes/career-os timeout 30 \
  python3 career-os/scripts/study-topic-recommender/refresh_topic_inventory.py > /tmp/plan016-python-stdout.json 2>&1
test -s /tmp/plan016-python-stdout.json \
  || { echo "PHASE_FAILED: Python baseline 출력 비어있음"; exit 1; }

# 산출물 백업
cp career-os/data/runtime/topic-inventory.json /tmp/plan016-python-inventory.json
cp career-os/data/runtime/morning-topic-recommendation.md /tmp/plan016-python-recommendation.md
echo "[2] Python baseline 캡처 OK"
```

### 3. ts draft 적용 (draft → scripts/)

```bash
cd /home/bifos/ai-nodes
DRAFT=career-os/tasks/plan016-study-topic-recommender-native/draft
TARGET=career-os/scripts/study-topic-recommender

# draft → target (cp + git add). draft는 history로 보존 (git rm 안 함).
cp "$DRAFT/refresh_topic_inventory.ts" "$TARGET/refresh_topic_inventory.ts"
cp "$DRAFT/feed_discovery.ts" "$TARGET/feed_discovery.ts"

# 동등 byte-for-byte 확인
diff -q "$DRAFT/refresh_topic_inventory.ts" "$TARGET/refresh_topic_inventory.ts" > /dev/null \
  || { echo "PHASE_FAILED: refresh_topic_inventory.ts target ↔ draft 불일치"; exit 1; }
diff -q "$DRAFT/feed_discovery.ts" "$TARGET/feed_discovery.ts" > /dev/null \
  || { echo "PHASE_FAILED: feed_discovery.ts target ↔ draft 불일치"; exit 1; }
echo "[3] ts draft 적용 OK"
```

### 4. tsc 검증

```bash
cd /home/bifos/ai-nodes
bunx tsc --noEmit 2>&1 | tee /tmp/plan016-phase02-tsc.log
[ "${PIPESTATUS[0]}" -eq 0 ] || { echo "PHASE_FAILED: tsc"; cat /tmp/plan016-phase02-tsc.log; exit 1; }
echo "[4] tsc OK"
```

### 5. ts 실행 + Python 출력과 동등성 검증

```bash
cd /home/bifos/ai-nodes
# ts 실행 (Python과 동일 환경)
TASK_ROOT=/home/bifos/ai-nodes/career-os timeout 60 \
  bun --env-file=career-os/.env career-os/scripts/study-topic-recommender/refresh_topic_inventory.ts \
  > /tmp/plan016-ts-stdout.json 2>&1
test -s /tmp/plan016-ts-stdout.json \
  || { echo "PHASE_FAILED: ts 출력 비어있음"; cat /tmp/plan016-ts-stdout.json; exit 1; }

# topic-inventory.json 동등성 (`generatedAt` 타임스탬프 제외)
python3 - <<'PY'
import json, sys
with open('/tmp/plan016-python-inventory.json') as f: py = json.load(f)
with open('/home/bifos/ai-nodes/career-os/data/runtime/topic-inventory.json') as f: ts = json.load(f)
# 타임스탬프 제외
for d in (py, ts):
    d.pop('generatedAt', None)
diff_count = 0
for key in set(list(py.keys()) + list(ts.keys())):
    if json.dumps(py.get(key), sort_keys=True, ensure_ascii=False) != json.dumps(ts.get(key), sort_keys=True, ensure_ascii=False):
        diff_count += 1
        print(f"DIFF key: {key}", file=sys.stderr)
if diff_count > 0:
    print(f"PHASE_FAILED: topic-inventory.json 동등성 위반 ({diff_count} key diff)")
    sys.exit(1)
print(f"[5-A] topic-inventory.json 동등 OK")
PY
[ $? -eq 0 ] || exit 1

# morning-topic-recommendation.md 동등성 (날짜 라인 제외)
diff -q <(grep -v "오늘의\|N개" /tmp/plan016-python-recommendation.md) \
        <(grep -v "오늘의\|N개" career-os/data/runtime/morning-topic-recommendation.md) \
  > /dev/null \
  || { echo "PHASE_FAILED: morning-topic-recommendation.md 동등성 위반"; \
       diff /tmp/plan016-python-recommendation.md career-os/data/runtime/morning-topic-recommendation.md | head -20; exit 1; }
echo "[5-B] morning-topic-recommendation.md 동등 OK"
```

### 6. Python 폐기

```bash
cd /home/bifos/ai-nodes
git rm career-os/scripts/study-topic-recommender/refresh_topic_inventory.py \
       career-os/scripts/study-topic-recommender/feed_discovery.py
echo "[6] Python 폐기 OK"
```

### 7. 커밋 + commit 개수 강제

```bash
cd /home/bifos/ai-nodes
HEAD_BEFORE=$(git rev-parse HEAD)

git add career-os/scripts/study-topic-recommender/refresh_topic_inventory.ts \
        career-os/scripts/study-topic-recommender/feed_discovery.ts \
        package.json package-lock.json bun.lockb 2>/dev/null || true

git commit -m "$(cat <<'COMMIT_EOF'
refactor(career-os): refresh_topic_inventory + feed_discovery Python → TypeScript 마이그 (plan016 phase-02)

ADR-026 적용. 622줄 Python 점수 알고리즘 + RSS 파서를 ts로 결정론 동등
마이그. fast-xml-parser 의존 추가.

검증:
- topic-inventory.json: Python vs ts 출력 동등 (generatedAt 타임스탬프
  제외)
- morning-topic-recommendation.md: 동등 (날짜 라인 제외)
- tsc 통과
- 알고리즘 (ADR-009/010/012/013): 점수 매기기 / mix target / cooldown
  모두 ts 동등 동작

Python 원본 폐기:
- career-os/scripts/study-topic-recommender/refresh_topic_inventory.py
- career-os/scripts/study-topic-recommender/feed_discovery.py
COMMIT_EOF
)" || { echo "PHASE_FAILED: commit"; exit 1; }

HEAD_AFTER=$(git rev-parse HEAD)
COMMITS=$(git rev-list "$HEAD_BEFORE..$HEAD_AFTER" --count)
[ "$COMMITS" = "1" ] \
  || { echo "PHASE_FAILED: 본 phase commit 수 $COMMITS (expected 1)"; exit 1; }
echo "[7] commit 1개 OK"
```

push는 phase-04.

## Critical Files

| 파일 | 변경 |
|---|---|
| `career-os/scripts/study-topic-recommender/refresh_topic_inventory.ts` | 신규 (draft 복제) |
| `career-os/scripts/study-topic-recommender/feed_discovery.ts` | 신규 (draft 복제) |
| `career-os/scripts/study-topic-recommender/refresh_topic_inventory.py` | git rm |
| `career-os/scripts/study-topic-recommender/feed_discovery.py` | git rm |
| `package.json` + `bun.lockb` (또는 `package-lock.json`) | fast-xml-parser 의존 추가 |

## Blocked 조건

- phase-01 commit 없음 → `PHASE_BLOCKED: phase-01 미완` + `exit 2`
- draft 부재 → `PHASE_BLOCKED` + `exit 2`
- 원본 Python 이미 없음 → `PHASE_BLOCKED: 부분 실행 의심` + `exit 2`
- fast-xml-parser 미설치 → `PHASE_FAILED: 의존 설치` + `exit 1`
- tsc 실패 → `PHASE_FAILED: tsc` + `exit 1`
- 동등성 검증 위반 → `PHASE_FAILED: 동등성` + `exit 1`
- commit 수 ≠ 1 → `PHASE_FAILED: commit 위장 의심` + `exit 1`

## 의도 메모

- *결정론 동등 검증*이 ADR-026의 핵심 — Python vs ts 출력 diff = 0.
- 타임스탬프 (generatedAt) + 날짜 표시 라인은 제외 (실행 시점마다 다르니 의미 없는 diff).
- draft는 *복제 후에도 history 보존* — git rm 안 함. plan016 종료 후 사용자가 다음 native 마이그 시 *템플릿*으로 활용 가능.
