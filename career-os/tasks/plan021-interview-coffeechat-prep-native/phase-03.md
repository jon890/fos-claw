# Phase 3 — collect_company_sites.ts 적용 + 동등성 검증 + Python + shell runner 폐기

**Model**: sonnet
**Status**: pending

---

## 목표

phase-01 draft의 `collect_company_sites.ts`를 새 위치 (skill rename 전 임시로 `career-os/scripts/cj-foodville-coffeechat-prep/`)에 적용. Python 원본과 동등성 검증 (3 URL fetch + HTML→text). 검증 통과 후 Python + shell runner 폐기.

skill 디렉터리 rename은 phase-04에서.

## 관련 docs

- phase-02 commit — mvp-target.json `primary.coffeechat` 마이그 완료
- `career-os/scripts/cj-foodville-coffeechat-prep/collect_foodville_sites.py` — 원본 (검증 baseline)
- `skills/plan-and-build/references/common-pitfalls.md` 6-6

## 사전 검증

```bash
cd /home/bifos/ai-nodes

# phase-02 commit
git log -1 --format='%s' | grep -q "plan021 phase-02" \
  || { echo "PHASE_BLOCKED: phase-02 commit 없음"; exit 2; }

# zod schema 적용됨
test -f _shared/lib/mvp_target_schema.ts \
  || { echo "PHASE_BLOCKED: mvp_target_schema.ts 부재"; exit 2; }

# mvp-target.json coffeechat 객체 존재
grep -q "\"coffeechat\": {" career-os/config/mvp-target.json \
  || { echo "PHASE_BLOCKED: mvp-target.json coffeechat 객체 부재 — phase-02 미완"; exit 2; }

# 원본 Python + shell 존재
test -f career-os/scripts/cj-foodville-coffeechat-prep/collect_foodville_sites.py \
  || { echo "PHASE_BLOCKED: 원본 Python 이미 부재"; exit 2; }
test -f career-os/scripts/cj-foodville-coffeechat-prep/run_foodville_coffeechat_prep.sh \
  || { echo "PHASE_BLOCKED: 원본 shell runner 이미 부재"; exit 2; }

echo "사전 검증 OK"
```

## 작업 항목

### 1. Python baseline 캡처 (검증용)

```bash
cd /home/bifos/ai-nodes
BASELINE_DIR=/tmp/plan021-python-baseline
rm -rf "$BASELINE_DIR" && mkdir -p "$BASELINE_DIR"

timeout 60 python3 career-os/scripts/cj-foodville-coffeechat-prep/collect_foodville_sites.py \
  "$BASELINE_DIR" 2>&1 | tee /tmp/plan021-python-stdout.json
test -s "$BASELINE_DIR/manifest.json" \
  || { echo "PHASE_FAILED: Python baseline manifest 비어있음"; exit 1; }
echo "[1] Python baseline 캡처 OK ($(ls $BASELINE_DIR | wc -l) 파일)"
```

### 2. collect_company_sites.ts 적용 (draft → scripts/)

`Read` 도구로 draft 로드. `Write`로 `career-os/scripts/cj-foodville-coffeechat-prep/collect_company_sites.ts`에 저장 (skill 디렉터리 rename은 phase-04).

```bash
cd /home/bifos/ai-nodes
DRAFT=career-os/tasks/plan021-interview-coffeechat-prep-native/draft/collect_company_sites.ts
TARGET=career-os/scripts/cj-foodville-coffeechat-prep/collect_company_sites.ts

# byte-for-byte 동일
diff -q "$TARGET" "$DRAFT" > /dev/null \
  || { echo "PHASE_FAILED: target ↔ draft 불일치"; exit 1; }
echo "[2] ts draft 적용 OK"
```

### 3. tsc 검증

```bash
cd /home/bifos/ai-nodes
bunx tsc --noEmit 2>&1 | tee /tmp/plan021-phase03-tsc.log
[ "${PIPESTATUS[0]}" -eq 0 ] || { echo "PHASE_FAILED: tsc"; cat /tmp/plan021-phase03-tsc.log; exit 1; }
echo "[3] tsc OK"
```

### 4. ts 실행 + 동등성 검증

```bash
cd /home/bifos/ai-nodes
TS_DIR=/tmp/plan021-ts-output
rm -rf "$TS_DIR" && mkdir -p "$TS_DIR"

timeout 60 bun career-os/scripts/cj-foodville-coffeechat-prep/collect_company_sites.ts \
  --outdir "$TS_DIR" 2>&1 | tee /tmp/plan021-ts-stdout.log

test -s "$TS_DIR/manifest.json" \
  || { echo "PHASE_FAILED: ts manifest 비어있음"; exit 1; }

# 파일 목록 동등성 (vips / cheiljemyunso-menu / cjfoodville-brand 각각 .html + .txt + manifest.json)
PYTHON_FILES=$(ls /tmp/plan021-python-baseline/ | sort | grep -v manifest.json | wc -l)
TS_FILES=$(ls "$TS_DIR/" | sort | grep -v manifest.json | wc -l)
[ "$PYTHON_FILES" = "$TS_FILES" ] \
  || { echo "PHASE_FAILED: Python $PYTHON_FILES vs ts $TS_FILES 파일 수 불일치"; \
       diff <(ls /tmp/plan021-python-baseline/ | sort) <(ls $TS_DIR/ | sort); exit 1; }
echo "[4] 파일 수 동등 ($PYTHON_FILES) OK"

# txt 본문 동등성 (HTML 파싱 결과 — 외부 사이트 변경 가능성으로 *유사*하면 OK, 완전 동일까지 강제하지 않음)
# 단 manifest.json의 site keys는 정확히 같아야
python3 - <<'PY'
import json
with open('/tmp/plan021-python-baseline/manifest.json') as f: py = json.load(f)
with open('/tmp/plan021-ts-output/manifest.json') as f: ts = json.load(f)
py_keys = sorted(s.get('key','') for s in py.get('sites', py if isinstance(py, list) else []))
ts_keys = sorted(s.get('key','') for s in ts.get('sites', ts if isinstance(ts, list) else []))
if py_keys != ts_keys:
    print(f'PHASE_FAILED: manifest sites 키 불일치')
    print(f'  Python: {py_keys}')
    print(f'  ts: {ts_keys}')
    exit(1)
print(f'[manifest 동등] sites keys: {ts_keys}')
PY
[ $? -eq 0 ] || exit 1
echo "[4-B] manifest 동등성 OK"
```

### 5. Python + shell runner 폐기

```bash
cd /home/bifos/ai-nodes
git rm career-os/scripts/cj-foodville-coffeechat-prep/collect_foodville_sites.py \
       career-os/scripts/cj-foodville-coffeechat-prep/run_foodville_coffeechat_prep.sh
echo "[5] Python + shell runner 폐기 OK"
```

### 6. 커밋 + commit 개수 강제

```bash
cd /home/bifos/ai-nodes
HEAD_BEFORE=$(git rev-parse HEAD)

git add career-os/scripts/cj-foodville-coffeechat-prep/

git commit -m "$(cat <<'COMMIT_EOF'
refactor(career-os): collect_foodville_sites.py → collect_company_sites.ts + run_foodville_coffeechat_prep.sh 폐기 (plan021 phase-03)

ADR-029 적용. Python collector → Bun TS 마이그.

신규:
- collect_company_sites.ts (~180줄, Bun fetch + HTML→text)
- mvp-target.json `primary.coffeechat.sites` 배열 Read (zod 검증)
- 회사 hard-coded URL 제거 (옛 vips/cheiljemyunso/cjfoodville-brand 그대로
  복사된 sites 배열이 mvp-target.json `primary.coffeechat.sites`에)

검증:
- Python vs ts 출력 파일 수 동등 (3 사이트 × html+txt + manifest.json)
- manifest.json sites keys 동등 (vips / cheiljemyunso-menu / cjfoodville-brand)
- tsc 통과

폐기:
- career-os/scripts/cj-foodville-coffeechat-prep/collect_foodville_sites.py (156줄)
- career-os/scripts/cj-foodville-coffeechat-prep/run_foodville_coffeechat_prep.sh (77줄)

skill 디렉터리 rename (cj-foodville-coffeechat-prep → interview-coffeechat-prep)
은 phase-04에서.
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
| `career-os/scripts/cj-foodville-coffeechat-prep/collect_company_sites.ts` | 신규 (Write, draft 복제) |
| `career-os/scripts/cj-foodville-coffeechat-prep/collect_foodville_sites.py` | git rm |
| `career-os/scripts/cj-foodville-coffeechat-prep/run_foodville_coffeechat_prep.sh` | git rm |

## Blocked 조건

- phase-02 commit 없음 → `PHASE_BLOCKED` + `exit 2`
- mvp_target_schema.ts 부재 → `PHASE_BLOCKED` + `exit 2`
- mvp-target.json coffeechat 객체 부재 → `PHASE_BLOCKED: phase-02 미완` + `exit 2`
- 원본 Python/shell 이미 부재 → `PHASE_BLOCKED: 부분 실행 의심` + `exit 2`
- Python baseline manifest 비어있음 → `PHASE_FAILED: 사이트 fetch 실패` + `exit 1`
- ts 출력 파일 수 != Python → `PHASE_FAILED` + `exit 1`
- manifest sites keys 불일치 → `PHASE_FAILED` + `exit 1`
- tsc 실패 → `PHASE_FAILED` + `exit 1`
- commit 수 ≠ 1 → `PHASE_FAILED: commit 위장 의심` + `exit 1`

## 의도 메모

- *외부 fetch 결정론*은 일부 변동 가능 (사이트 HTML 자체 갱신) — 본 phase는 *파일 수 + manifest keys*만 동등 검증. 본문은 *유사*면 OK.
- skill 디렉터리는 *phase-04에서 rename* — 본 phase에서는 옛 경로 유지.
