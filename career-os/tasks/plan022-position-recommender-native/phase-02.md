# Phase 2 — collect_live_postings.ts 적용 + 동등성 검증 + Python 폐기

**Model**: sonnet
**Status**: pending

---

## 목표

phase-01 draft의 `collect_live_postings.ts`를 `career-os/scripts/position-recommender/`에 적용. Python 원본과 동등성 검증 (Wanted + Toss API 결과 비교). 검증 통과 후 Python 폐기.

## 사전 검증

```bash
cd /home/bifos/ai-nodes

# phase-01 commit
git log -1 --format='%s' | grep -q "plan022 phase-01" \
  || { echo "PHASE_BLOCKED: phase-01 commit 없음"; exit 2; }

# draft 존재
DRAFT=career-os/tasks/plan022-position-recommender-native/draft
test -f "$DRAFT/collect_live_postings.ts" \
  || { echo "PHASE_BLOCKED: draft ts 부재"; exit 2; }

# 원본 Python 존재
test -f career-os/scripts/position-recommender/collect_live_postings.py \
  || { echo "PHASE_BLOCKED: 원본 Python 이미 부재"; exit 2; }

echo "사전 검증 OK"
```

## 작업 항목

### 1. Python baseline 캡처

```bash
cd /home/bifos/ai-nodes
timeout 60 python3 career-os/scripts/position-recommender/collect_live_postings.py \
  > /tmp/plan022-python-output.md 2>/tmp/plan022-python-stderr.log
test -s /tmp/plan022-python-output.md \
  || { echo "PHASE_FAILED: Python baseline 출력 비어있음"; cat /tmp/plan022-python-stderr.log; exit 1; }
PYTHON_BYTES=$(wc -c < /tmp/plan022-python-output.md)
echo "[1] Python baseline 캡처 OK ($PYTHON_BYTES bytes)"
```

### 2. ts 적용

`Read` 도구로 draft 로드. `Write`로 `career-os/scripts/position-recommender/collect_live_postings.ts`에 저장.

```bash
cd /home/bifos/ai-nodes
diff -q career-os/scripts/position-recommender/collect_live_postings.ts \
        career-os/tasks/plan022-position-recommender-native/draft/collect_live_postings.ts > /dev/null \
  || { echo "PHASE_FAILED: target ↔ draft 불일치"; exit 1; }
echo "[2] ts draft 적용 OK"
```

### 3. tsc 검증

```bash
cd /home/bifos/ai-nodes
bunx tsc --noEmit 2>&1 | tee /tmp/plan022-phase02-tsc.log
[ "${PIPESTATUS[0]}" -eq 0 ] || { echo "PHASE_FAILED: tsc"; cat /tmp/plan022-phase02-tsc.log; exit 1; }
echo "[3] tsc OK"
```

### 4. ts 실행 + 동등성 검증

```bash
cd /home/bifos/ai-nodes
timeout 60 bun career-os/scripts/position-recommender/collect_live_postings.ts \
  > /tmp/plan022-ts-output.md 2>/tmp/plan022-ts-stderr.log

test -s /tmp/plan022-ts-output.md \
  || { echo "PHASE_FAILED: ts 출력 비어있음"; cat /tmp/plan022-ts-stderr.log; exit 1; }

TS_BYTES=$(wc -c < /tmp/plan022-ts-output.md)
echo "[4-A] ts 출력 $TS_BYTES bytes"

# 동등성 — 외부 API 응답 시점별 차이 가능. *구조 동등* 검증 (header / 회사 수 / posting 수)
python3 - <<'PY'
import sys
py = open('/tmp/plan022-python-output.md').read()
ts = open('/tmp/plan022-ts-output.md').read()

# Wanted/Toss 섹션 존재
for name, text in [('Python', py), ('ts', ts)]:
    if 'Wanted' not in text and 'wanted' not in text.lower():
        print(f'PHASE_FAILED: {name} 출력에 Wanted 섹션 누락', file=sys.stderr)
        exit(1)
    if 'Toss' not in text and 'toss' not in text.lower():
        print(f'PHASE_FAILED: {name} 출력에 Toss 섹션 누락', file=sys.stderr)
        exit(1)

# 라인 수 ±20% 허용 (외부 API 시점별 변동 감안)
py_lines = len(py.splitlines())
ts_lines = len(ts.splitlines())
if abs(py_lines - ts_lines) > max(py_lines, ts_lines) * 0.2:
    print(f'PHASE_FAILED: 라인 수 차이 큼 (Python {py_lines} vs ts {ts_lines})', file=sys.stderr)
    exit(1)

print(f'[4-B] 구조 동등 OK (Python {py_lines} vs ts {ts_lines} 라인)')
PY
[ $? -eq 0 ] || exit 1
```

### 5. Python 폐기

```bash
cd /home/bifos/ai-nodes
git rm career-os/scripts/position-recommender/collect_live_postings.py
echo "[5] Python 폐기 OK"
```

### 6. 커밋 + commit 개수 강제

```bash
cd /home/bifos/ai-nodes
HEAD_BEFORE=$(git rev-parse HEAD)

git add career-os/scripts/position-recommender/

git commit -m "$(cat <<'COMMIT_EOF'
refactor(career-os): collect_live_postings.py → ts 마이그 + 활성화 (plan022 phase-02)

ADR-030 적용. Python 298줄 (requests) → Bun fetch + 활성화 회복.
plan005(ADR-017) wire-up되지 못해 1개월+ deferred였던 자산을 native skill
(plan022 phase-03)에서 호출 가능하도록 ts로 마이그.

검증:
- Python vs ts 구조 동등 (Wanted/Toss 섹션 모두 존재)
- 라인 수 차이 ≤20% (외부 API 시점별 변동 감안)
- tsc 통과

폐기:
- career-os/scripts/position-recommender/collect_live_postings.py (298줄)

phase-03에서 SKILL.md Write + 옛 자산 일괄 폐기 + dispatcher case 폐기.
COMMIT_EOF
)" || { echo "PHASE_FAILED: commit"; exit 1; }

HEAD_AFTER=$(git rev-parse HEAD)
COMMITS=$(git rev-list "$HEAD_BEFORE..$HEAD_AFTER" --count)
[ "$COMMITS" = "1" ] || { echo "PHASE_FAILED: commit 수 $COMMITS"; exit 1; }
echo "[6] commit 1 OK"
```

## Critical Files

| 파일 | 변경 |
|---|---|
| `career-os/scripts/position-recommender/collect_live_postings.ts` | 신규 (draft 복제) |
| `career-os/scripts/position-recommender/collect_live_postings.py` | git rm |

## Blocked 조건

- phase-01 commit 없음 → `PHASE_BLOCKED` + `exit 2`
- 원본 Python 이미 부재 → `PHASE_BLOCKED: 부분 실행 의심` + `exit 2`
- Python baseline 출력 비어있음 → `PHASE_FAILED: 외부 API 호출 실패` + `exit 1`
- ts 출력 비어있음 → `PHASE_FAILED` + `exit 1`
- 구조 동등성 위반 (Wanted/Toss 누락) → `PHASE_FAILED` + `exit 1`
- 라인 수 ±20% 초과 → `PHASE_FAILED` + `exit 1`
- tsc 실패 → `PHASE_FAILED` + `exit 1`
- commit 수 ≠ 1 → `PHASE_FAILED` + `exit 1`

## 의도 메모

- 외부 API 응답은 *시점별 변동* — byte-for-byte 동등 강제하지 않고 *구조 동등* (섹션 존재 + 라인 수 근사).
- plan005 wire-up 못 한 자산을 *지금 활성화* — native skill phase-03에서 *선택적 호출*로 흡수.
