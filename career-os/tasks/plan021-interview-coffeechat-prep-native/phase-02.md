# Phase 2 — zod 의존성 + mvp_target_schema.ts 적용 + mvp-target.json `primary.coffeechat` 객체 마이그

**Model**: sonnet
**Status**: pending

---

## 목표

zod 라이브러리 설치 + phase-01의 `mvp_target_schema.ts` draft를 `_shared/lib/`로 적용 + `mvp-target.json` 옛 6 평면 변수를 `primary.coffeechat` 객체로 마이그. zod 검증으로 마이그 후 정확성 보장.

## 관련 docs

- phase-01 commit — 3 draft 작성 완료
- `career-os/docs/adr.md` ADR-029
- `skills/plan-and-build/references/common-pitfalls.md` 6-6

## 사전 검증

```bash
cd /home/bifos/ai-nodes

# phase-01 commit
git log -1 --format='%s' | grep -q "plan021 phase-01" \
  || { echo "PHASE_BLOCKED: phase-01 commit 없음"; exit 2; }

# draft 3개 존재
DRAFT=career-os/tasks/plan021-interview-coffeechat-prep-native/draft
for f in SKILL.md collect_company_sites.ts mvp_target_schema.ts; do
  test -f "$DRAFT/$f" || { echo "PHASE_BLOCKED: draft/$f 부재"; exit 2; }
done

# mvp-target.json 옛 변수 존재 (마이그 전 상태)
grep -q "coffeechat_skill_dir\|coffeechat_collector_script" career-os/config/mvp-target.json \
  || { echo "PHASE_BLOCKED: 옛 평면 변수 이미 부재 — 부분 실행 의심"; exit 2; }

# Bun 가용
which bun >/dev/null || { echo "PHASE_BLOCKED: bun 미설치"; exit 2; }

echo "사전 검증 OK"
```

## 작업 항목

### 1. zod 의존성 추가

```bash
cd /home/bifos/ai-nodes
bun add zod 2>&1 | tail -5
test -d node_modules/zod || { echo "PHASE_FAILED: zod 미설치"; exit 1; }
echo "[1] zod 설치 OK"
```

### 2. mvp_target_schema.ts 적용 (draft → _shared/lib/)

`Read` 도구로 `career-os/tasks/plan021-interview-coffeechat-prep-native/draft/mvp_target_schema.ts` 로드.

`Write` 도구로 `_shared/lib/mvp_target_schema.ts`에 **draft 본문 그대로** 저장.

```bash
cd /home/bifos/ai-nodes
# byte-for-byte diff 검증
diff -q _shared/lib/mvp_target_schema.ts \
        career-os/tasks/plan021-interview-coffeechat-prep-native/draft/mvp_target_schema.ts > /dev/null \
  || { echo "PHASE_FAILED: schema draft ↔ target 불일치"; exit 1; }
echo "[2] mvp_target_schema.ts 적용 OK"
```

### 3. baseline 캡처 (마이그 전)

```bash
cd /home/bifos/ai-nodes
cp career-os/config/mvp-target.json /tmp/plan021-mvp-baseline.json
echo "[3] baseline 캡처 OK"
```

### 4. mvp-target.json `primary.coffeechat` 객체 마이그

`Read` 도구로 `career-os/config/mvp-target.json` 로드. `Edit` 도구로 다음 변경:

**옛 평면 변수** (제거):
```
"coffeechat_skill_dir": "cj-foodville-coffeechat-prep",
"coffeechat_report_slug": "cj-foodville-coffeechat",
"coffeechat_source_dir": "cj-foodville-sites",
"coffeechat_collector_script": "collect_foodville_sites.py",
"coffeechat_brand_snapshot": "cjfoodville-brand.txt"
```

**새 `primary.coffeechat` 객체** (추가):
```json
"coffeechat": {
  "sites": [
    {"key": "vips", "url": "https://www.ivips.co.kr/", "label": "VIPS"},
    {"key": "cheiljemyunso-menu", "url": "https://www.cheiljemyunso.co.kr/menu?categoryIdx=4", "label": "제일제면소 메뉴"},
    {"key": "cjfoodville-brand", "url": "https://m.cjfoodville.co.kr:7443/brand/introduce.asp", "label": "CJ푸드빌 브랜드 소개"}
  ],
  "source_dir": "cj-foodville-sites",
  "report_slug": "cj-foodville-coffeechat",
  "prep_dir": "cj-foodville",
  "strategy_filename": "strategy.md",
  "checklist_filename": "checklist.md"
}
```

(URL 3개는 phase-01 인벤토리에서 확인된 `collect_foodville_sites.py` hard-coded URL과 동일하게 복사)

### 5. zod 검증

```bash
cd /home/bifos/ai-nodes
# zod parse로 mvp-target.json 검증
bun -e "
import { parseMvpTarget } from './_shared/lib/mvp_target_schema';
const target = parseMvpTarget('career-os/config/mvp-target.json');
console.log('parseMvpTarget OK');
console.log('coffeechat.sites count:', target.primary.coffeechat?.sites.length);
console.log('coffeechat.source_dir:', target.primary.coffeechat?.source_dir);
console.log('coffeechat.report_slug:', target.primary.coffeechat?.report_slug);
" 2>&1 | tee /tmp/plan021-zod-parse.log
grep -q "parseMvpTarget OK" /tmp/plan021-zod-parse.log \
  || { echo "PHASE_FAILED: zod parse 실패"; exit 1; }
grep -q "coffeechat.sites count: 3" /tmp/plan021-zod-parse.log \
  || { echo "PHASE_FAILED: sites 배열 3개 아님"; exit 1; }
echo "[5] zod 검증 OK"
```

### 6. 옛 평면 변수 잔재 0 확인

```bash
cd /home/bifos/ai-nodes
for kw in "coffeechat_skill_dir" "coffeechat_collector_script" \
          "coffeechat_brand_snapshot" "coffeechat_source_dir\":" \
          "coffeechat_report_slug\":"; do
  HITS=$(grep -c "$kw" career-os/config/mvp-target.json)
  [ "$HITS" = "0" ] || { echo "PHASE_FAILED: 옛 평면 변수 '$kw' 잔재"; exit 1; }
done
echo "[6] 옛 평면 변수 잔재 0 OK"
```

### 7. tsc 검증

```bash
cd /home/bifos/ai-nodes
bunx tsc --noEmit 2>&1 | tee /tmp/plan021-phase02-tsc.log
[ "${PIPESTATUS[0]}" -eq 0 ] || { echo "PHASE_FAILED: tsc"; cat /tmp/plan021-phase02-tsc.log; exit 1; }
echo "[7] tsc OK"
```

### 8. 커밋 + commit 개수 강제

```bash
cd /home/bifos/ai-nodes
HEAD_BEFORE=$(git rev-parse HEAD)

git add _shared/lib/mvp_target_schema.ts \
        career-os/config/mvp-target.json \
        package.json bun.lockb 2>/dev/null || true
# 또는 package-lock.json
git add package-lock.json 2>/dev/null || true

git commit -m "$(cat <<'COMMIT_EOF'
feat(_shared, career-os): zod 의존성 + mvp_target_schema.ts + mvp-target.json `primary.coffeechat` 객체 마이그 (plan021 phase-02)

ADR-029 적용. zod 도입 + mvp-target 추상화 첫 단계.

신규:
- _shared/lib/mvp_target_schema.ts (~80줄) — zod 스키마 + parseMvpTarget()
- zod 의존성 (작은 라이브러리, Bun 호환)

마이그:
- mvp-target.json: 옛 평면 변수 5개 (coffeechat_skill_dir / coffeechat_report_slug /
  coffeechat_source_dir / coffeechat_collector_script / coffeechat_brand_snapshot)
  → `primary.coffeechat` 객체 (sites 배열 [3 URL] + source_dir + report_slug +
  prep_dir + strategy_filename + checklist_filename)
- sites 배열은 옛 collect_foodville_sites.py hard-coded URL 3개와 동일

검증:
- bun -e "parseMvpTarget()" 통과
- coffeechat.sites count: 3 (vips / cheiljemyunso / cjfoodville-brand)
- tsc 통과
- 옛 평면 변수 잔재 0

phase-03에서 collect_company_sites.ts 적용 + Python 폐기.
COMMIT_EOF
)" || { echo "PHASE_FAILED: commit"; exit 1; }

HEAD_AFTER=$(git rev-parse HEAD)
COMMITS=$(git rev-list "$HEAD_BEFORE..$HEAD_AFTER" --count)
[ "$COMMITS" = "1" ] || { echo "PHASE_FAILED: commit 수 $COMMITS"; exit 1; }
echo "[8] commit 1 OK"
```

## Critical Files

| 파일 | 변경 |
|---|---|
| `_shared/lib/mvp_target_schema.ts` | 신규 (Write, draft 복제) |
| `career-os/config/mvp-target.json` | 옛 평면 변수 → `primary.coffeechat` 객체 |
| `package.json` + `bun.lockb` (또는 `package-lock.json`) | zod 의존성 |

## Blocked 조건

- phase-01 commit 없음 → `PHASE_BLOCKED` + `exit 2`
- draft 부재 → `PHASE_BLOCKED` + `exit 2`
- 옛 평면 변수 이미 부재 → `PHASE_BLOCKED: 부분 실행 의심` + `exit 2`
- zod 미설치 → `PHASE_FAILED` + `exit 1`
- zod parse 실패 → `PHASE_FAILED` + `exit 1`
- tsc 실패 → `PHASE_FAILED` + `exit 1`
- 옛 평면 변수 잔재 ≥1 → `PHASE_FAILED` + `exit 1`
- commit 수 ≠ 1 → `PHASE_FAILED: commit 위장 의심` + `exit 1`

## 의도 메모

- *zod parse 검증*이 phase-02 핵심 — schema와 mvp-target.json 동시 정확성 보장.
- sites 배열의 URL은 *반드시 옛 Python hard-coded와 동일* (3 URL). 향후 변경은 별도 commit.
