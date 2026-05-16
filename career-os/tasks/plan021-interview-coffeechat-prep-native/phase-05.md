# Phase 5 — 5문서 + AGENTS.md 갱신 + 정적 검증 + push + trailing + index.json completed

**Model**: sonnet
**Status**: pending

---

## 목표

plan021 변경 (interview-coffeechat-prep skill + zod + coffeechat 묶기 + 자산 이동)을 5문서 + AGENTS.md에 반영. 종합 정적 검증. 모든 commit push + index.json completed + trailing.

## 사전 검증

```bash
cd /home/bifos/ai-nodes

# phase-04 commit
git log -1 --format='%s' | grep -q "plan021 phase-04" \
  || { echo "PHASE_BLOCKED: phase-04 commit 없음"; exit 2; }

# branch
[ "$(git branch --show-current)" = "main" ] \
  || { echo "PHASE_BLOCKED: branch != main"; exit 2; }

# 핵심 산출물 존재
test -f career-os/.claude/skills/interview-coffeechat-prep/SKILL.md \
  || { echo "PHASE_BLOCKED: SKILL.md 부재"; exit 2; }
test -f career-os/scripts/interview-coffeechat-prep/collect_company_sites.ts \
  || { echo "PHASE_BLOCKED: ts collector 부재"; exit 2; }
test -f _shared/lib/mvp_target_schema.ts \
  || { echo "PHASE_BLOCKED: zod schema 부재"; exit 2; }
test -f career-os/data/prep/cj-foodville/strategy.md \
  || { echo "PHASE_BLOCKED: data/prep/cj-foodville/strategy.md 부재"; exit 2; }

echo "사전 검증 OK"
```

## 작업 항목

### 1. docs 갱신

#### 1-A. prd.md 기능 표

- `foodville-coffeechat` (dispatcher) 행 제거
- `/interview-coffeechat-prep` (native) 행 추가:
  - 산출물: `data/reports/daily/YYYY-MM-DD/<coffeechat.report_slug>/report.md` + `data/runtime/<coffeechat.report_slug>.md`
  - 외부 git push: 없음 (비공개)
  - 빈도: 면접 단계별

#### 1-B. flow.md

기존 `foodville-coffeechat` 섹션을 *interview-coffeechat-prep* 섹션으로 갱신. ASCII flow:

```
호출: claude -p "/interview-coffeechat-prep"
  ↓
Read: config/mvp-target.json (zod parse → primary.coffeechat 객체)
  ↓
Bash: bun career-os/scripts/interview-coffeechat-prep/collect_company_sites.ts
  → data/source/<coffeechat.source_dir>/ (sites HTML + txt + manifest.json)
  ↓
Read: candidate-profile.md + data/prep/<coffeechat.prep_dir>/{strategy,checklist}.md
      + 수집된 sites text + references/coffeechat-prompt.md
  ↓
Claude 분석 → report.md 작성
  ↓
Write: data/reports/daily/YYYY-MM-DD/<coffeechat.report_slug>/report.md
       data/runtime/<coffeechat.report_slug>.md (사본)
  ↓
Discord 알림 [완료]
```

#### 1-C. code-architecture.md

- `scripts/cj-foodville-coffeechat-prep/` 트리 라인 → `scripts/interview-coffeechat-prep/` rename + Python/shell runner 제거 + ts collector 추가
- `.claude/skills/cj-foodville-coffeechat-prep/` 트리 라인 → `interview-coffeechat-prep` rename
- `_shared/lib/mvp_target_schema.ts` 추가 (zod schema)
- `data/prep/<company-slug>/` 디렉터리 추가
- 외부 의존성 섹션에 `zod` 추가

#### 1-D. data-schema.md

- `config/mvp-target.json` 스키마 갱신 — `primary.coffeechat` 객체 명시 + 옛 평면 변수 history 표기
- `data/prep/<company-slug>/` 구조 추가 (strategy.md + checklist.md)
- `_shared/lib/mvp_target_schema.ts` 참조 명시 (zod 검증 단일 출처)

#### 1-E. AGENTS.md

- dispatcher 명령: 2개 → 1개 (`recommend-positions`만)
- native skill 진입점에 `/interview-coffeechat-prep` 추가

### 2. 정적 검증

```bash
cd /home/bifos/ai-nodes

# A. 옛 skill 이름 잔재 0 (history mention 제외 — task/plan*/draft + adr.md history는 허용)
HITS=$(grep -rln "cj-foodville-coffeechat-prep" \
  career-os/.claude/skills/ career-os/scripts/ _shared/ 2>/dev/null | wc -l)
[ "$HITS" = "0" ] || { echo "PHASE_FAILED: skill 이름 잔재 $HITS"; \
  grep -rln "cj-foodville-coffeechat-prep" career-os/.claude/skills/ career-os/scripts/ _shared/ 2>/dev/null; exit 1; }
echo "[A] 옛 skill 이름 잔재 0 OK"

# B. 옛 Python/shell runner 잔재 0
HITS=$(grep -rln "collect_foodville_sites\.py\|run_foodville_coffeechat_prep\.sh" \
  career-os/.claude/skills/ career-os/scripts/ _shared/ 2>/dev/null | wc -l)
[ "$HITS" = "0" ] || { echo "PHASE_FAILED: 옛 Python/shell 잔재 $HITS"; exit 1; }
echo "[B] 옛 Python/shell 잔재 0 OK"

# C. 옛 평면 변수 잔재 0 (mvp-target.json + skill 본문)
for kw in "coffeechat_skill_dir" "coffeechat_collector_script" "coffeechat_brand_snapshot"; do
  HITS=$(grep -rln "$kw" career-os/config/ career-os/.claude/skills/ career-os/scripts/ _shared/ 2>/dev/null | wc -l)
  [ "$HITS" = "0" ] || { echo "PHASE_FAILED: 옛 평면 변수 '$kw' 잔재"; exit 1; }
done
echo "[C] 옛 평면 변수 잔재 0 OK"

# D. dispatcher case 1개 (recommend-positions만) + bash syntax
bash -n career-os/scripts/command-router/run_now.sh \
  || { echo "PHASE_FAILED: dispatcher bash syntax"; exit 1; }
CASES=$(grep -cE "^\s*[a-z-]+\)" career-os/scripts/command-router/run_now.sh)
[ "$CASES" = "1" ] || { echo "PHASE_FAILED: dispatcher case 수 $CASES (expected 1)"; exit 1; }
echo "[D] dispatcher case 1개 OK"

# E. tsc 통과
bunx tsc --noEmit 2>&1 | tee /tmp/plan021-phase05-tsc.log
[ "${PIPESTATUS[0]}" -eq 0 ] || { echo "PHASE_FAILED: tsc"; cat /tmp/plan021-phase05-tsc.log; exit 1; }
echo "[E] tsc OK"

# F. zod parse 통과 (mvp-target.json 정상)
bun -e "
import { parseMvpTarget } from './_shared/lib/mvp_target_schema';
const t = parseMvpTarget('career-os/config/mvp-target.json');
console.log('coffeechat:', t.primary.coffeechat ? 'present' : 'missing');
console.log('sites count:', t.primary.coffeechat?.sites.length);
" 2>&1 | tee /tmp/plan021-phase05-zod.log
grep -q "coffeechat: present" /tmp/plan021-phase05-zod.log \
  || { echo "PHASE_FAILED: zod parse"; exit 1; }
echo "[F] zod parse OK"

# G. SKILL.md 필수 섹션 + 회사명 박힘 없음
SKILL=career-os/.claude/skills/interview-coffeechat-prep/SKILL.md
for s in "When to use" "Inputs" "Workflow" "Self-check" "Error handling" "coffeechat"; do
  grep -q "$s" "$SKILL" || { echo "PHASE_FAILED: SKILL.md '$s' 누락"; exit 1; }
done
HITS=$(grep -cE "CJ Foodville|cj-foodville-coffeechat|cjfoodville" "$SKILL")
[ "$HITS" = "0" ] || { echo "PHASE_FAILED: SKILL.md 회사명 박힘 잔재"; exit 1; }
echo "[G] SKILL.md 검증 OK"

# H. docs 갱신 확인
for d in prd flow code-architecture data-schema; do
  grep -q "interview-coffeechat-prep" "career-os/docs/$d.md" \
    || { echo "PHASE_FAILED: docs/$d.md 안내 누락"; exit 1; }
done
grep -q "interview-coffeechat-prep" career-os/AGENTS.md \
  || { echo "PHASE_FAILED: AGENTS.md 안내 누락"; exit 1; }
echo "[H] docs 갱신 OK"

# I. data/prep/cj-foodville/ 존재 + docs/prep 빈 디렉터리 부재
test -f career-os/data/prep/cj-foodville/strategy.md && \
test -f career-os/data/prep/cj-foodville/checklist.md \
  || { echo "PHASE_FAILED: 회사 자산 이동 미완"; exit 1; }
test ! -d career-os/docs/prep \
  || { ls career-os/docs/prep/ 2>/dev/null; echo "PHASE_FAILED: docs/prep/ 잔존"; exit 1; }
echo "[I] 자산 이동 OK"

# J. plan021 phase commit history
PLAN_COMMITS=$(git log --oneline | grep -c "plan021 phase-")
[ "$PLAN_COMMITS" -ge 4 ] || { echo "PHASE_FAILED: plan021 commit $PLAN_COMMITS (expected ≥4)"; exit 1; }
echo "[J] commit history OK"

echo "=== 정적 검증 전부 통과 ==="
```

### 3. index.json status=completed

```bash
cd /home/bifos/ai-nodes
python3 - <<'PY'
import json
from pathlib import Path
p = Path("career-os/tasks/plan021-interview-coffeechat-prep-native/index.json")
d = json.loads(p.read_text(encoding="utf-8"))
d["status"] = "completed"
d["current_phase"] = 5
for ph in d["phases"]:
    ph["status"] = "completed"
p.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("[index.json] completed")
PY
```

### 4. 최종 commit + push

```bash
cd /home/bifos/ai-nodes
HEAD_BEFORE=$(git rev-parse HEAD)

git add career-os/AGENTS.md \
        career-os/docs/ \
        career-os/tasks/plan021-interview-coffeechat-prep-native/index.json

git commit -m "$(cat <<'COMMIT_EOF'
docs(career-os): interview-coffeechat-prep 5문서 + AGENTS.md 갱신 + plan021 완료 (phase-05)

ADR-029 적용 마무리. plan021 phase-01~04 완료 후 docs 후속 정리.

- prd.md 기능 표: foodville-coffeechat (dispatcher) 행 → /interview-coffeechat-prep
  (native) 행
- flow.md: interview-coffeechat-prep ASCII flow 박기 (zod parse → collector ts
  → Claude 분석 → report)
- code-architecture.md: skill + scripts rename, ts collector + zod schema 트리
  추가, data/prep/<company-slug>/ 디렉터리
- data-schema.md: mvp-target.json `primary.coffeechat` 스키마 + zod 검증 단일
  출처 + data/prep/<company-slug>/ 구조
- AGENTS.md: dispatcher 명령 2 → 1 (recommend-positions만), native skill 진입점
  목록에 /interview-coffeechat-prep 추가

정적 검증 10 항목 통과 (옛 skill 이름 / Python / shell / 평면 변수 잔재 0
+ dispatcher 1 + tsc + zod parse + SKILL.md + docs 갱신 + 자산 이동 +
commit history).

native skill 진입점 누적 6개: study-pack-writer + interview-asset-writer +
study-topic-recommender + interview-prep-analyzer + candidate-baseline-suggester
+ interview-coffeechat-prep.

dispatcher case 1개만 남음 (recommend-positions). plan022 후 plan023에서
command-router 일괄 폐기 예정.
COMMIT_EOF
)" || { echo "PHASE_FAILED: commit"; exit 1; }

HEAD_AFTER=$(git rev-parse HEAD)
COMMITS=$(git rev-list "$HEAD_BEFORE..$HEAD_AFTER" --count)
[ "$COMMITS" = "1" ] || { echo "PHASE_FAILED: commit 수 $COMMITS"; exit 1; }

git push origin main || { echo "PHASE_FAILED: push"; exit 1; }
echo "[4] commit + push OK"
```

### 5. trailing cleanup

```bash
cd /home/bifos/ai-nodes
if [ -n "$(git status --porcelain career-os/tasks/plan021-interview-coffeechat-prep-native/index.json)" ]; then
  git add career-os/tasks/plan021-interview-coffeechat-prep-native/index.json
  git commit -m "task(career-os): plan021 index.json commitSha 후기록"
  git push origin main
fi

DIRTY=$(git status --porcelain career-os/tasks/plan021-interview-coffeechat-prep-native/ | wc -l)
[ "$DIRTY" = "0" ] || { echo "PHASE_FAILED: trailing dirty"; exit 1; }
echo "trailing cleanup OK"
```

## 사용자 직접 처리 안내 (phase 외)

phase 종료 후 사용자가 환경에서 수행:

```bash
# 실제 native skill 동작 smoke
claude -p "/interview-coffeechat-prep"

# 산출물 확인
ls career-os/data/reports/daily/<오늘>/cj-foodville-coffeechat/
cat career-os/data/runtime/cj-foodville-coffeechat.md

# 다른 회사 전환 시:
#   career-os/config/mvp-target.json `primary.coffeechat` 객체만 통째 교체
#   data/prep/<new-company>/strategy.md + checklist.md 작성
#   docs/source/<new-company>-sites/ collector 자동 생성
```

## Blocked 조건

- phase-04 commit 없음 → `PHASE_BLOCKED` + `exit 2`
- branch != main → `PHASE_BLOCKED` + `exit 2`
- 핵심 산출물 부재 → `PHASE_BLOCKED` + `exit 2`
- 정적 검증 A~J 실패 → `PHASE_FAILED: <항목>` + `exit 1`
- commit 수 ≠ 1 → `PHASE_FAILED: commit 위장 의심` + `exit 1`
- push 실패 → `PHASE_FAILED` + `exit 1`
- trailing dirty → `PHASE_FAILED` + `exit 1`

## 의도 메모

- 정적 검증 10 항목 — 회사 추상화 검증 (회사명 박힘 0) + zod 검증 + 자산 이동 검증 모두.
- 다음 plan022 = position-recommender native 마이그 → plan023 = command-router 일괄 폐기.
