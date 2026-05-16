# Phase 4 — skill rename + SKILL.md Write + dispatcher case 폐기 + docs/prep → data/prep 이동

**Model**: sonnet
**Status**: pending

---

## 목표

skill 디렉터리 + scripts 디렉터리 rename (cj-foodville-coffeechat-prep → interview-coffeechat-prep). draft SKILL.md 적용. dispatcher foodville-coffeechat case 폐기. 회사 hand-crafted 자산 이동 (docs/prep → data/prep/<company-slug>/).

## 관련 docs

- phase-03 commit — collect_company_sites.ts 적용 + Python 폐기 완료
- `career-os/tasks/plan021-interview-coffeechat-prep-native/draft/SKILL.md` — Write 원본
- `skills/plan-and-build/references/common-pitfalls.md` 6-6

## 사전 검증

```bash
cd /home/bifos/ai-nodes

# phase-03 commit
git log -1 --format='%s' | grep -q "plan021 phase-03" \
  || { echo "PHASE_BLOCKED: phase-03 commit 없음"; exit 2; }

# 폐기 대상 존재 (부분 실행 의심)
test -d career-os/.claude/skills/cj-foodville-coffeechat-prep \
  || { echo "PHASE_BLOCKED: skill 디렉터리 이미 부재"; exit 2; }
test -d career-os/scripts/cj-foodville-coffeechat-prep \
  || { echo "PHASE_BLOCKED: scripts 디렉터리 이미 부재"; exit 2; }
grep -qE "^\s*foodville-coffeechat\)" career-os/scripts/command-router/run_now.sh \
  || { echo "PHASE_BLOCKED: dispatcher case 이미 부재"; exit 2; }

# 신규 위치 부재 확인
test ! -d career-os/.claude/skills/interview-coffeechat-prep \
  || { echo "PHASE_BLOCKED: interview-coffeechat-prep 이미 존재"; exit 2; }

# 회사 자산 docs/prep 존재
test -d career-os/docs/prep \
  || { echo "PHASE_BLOCKED: docs/prep 부재"; exit 2; }

# draft SKILL.md
DRAFT=career-os/tasks/plan021-interview-coffeechat-prep-native/draft/SKILL.md
test -f "$DRAFT" || { echo "PHASE_BLOCKED: draft SKILL.md 부재"; exit 2; }

echo "사전 검증 OK"
```

## 작업 항목

### 1. skill 디렉터리 rename (.claude/skills/)

```bash
cd /home/bifos/ai-nodes
git mv career-os/.claude/skills/cj-foodville-coffeechat-prep \
       career-os/.claude/skills/interview-coffeechat-prep
echo "[1-A] .claude/skills/ rename OK"
```

### 2. scripts 디렉터리 rename

```bash
cd /home/bifos/ai-nodes
git mv career-os/scripts/cj-foodville-coffeechat-prep \
       career-os/scripts/interview-coffeechat-prep
echo "[1-B] scripts/ rename OK"
```

### 3. SKILL.md Write (draft → 신규 위치)

기존 옛 SKILL.md는 git mv로 따라왔지만 본문이 옛 형식. `Read` draft + `Write`로 덮어쓰기.

```bash
cd /home/bifos/ai-nodes
TARGET=career-os/.claude/skills/interview-coffeechat-prep/SKILL.md
DRAFT=career-os/tasks/plan021-interview-coffeechat-prep-native/draft/SKILL.md

# byte-for-byte 동일
diff -q "$TARGET" "$DRAFT" > /dev/null \
  || { echo "PHASE_FAILED: SKILL.md target ↔ draft 불일치"; exit 1; }

# 필수 섹션
for s in "When to use" "Inputs" "Workflow" "Self-check" "Error handling" \
         "interview-coffeechat-prep" "coffeechat"; do
  grep -q "$s" "$TARGET" || { echo "PHASE_FAILED: '$s' 누락"; exit 1; }
done

# 회사명 박힘 없음
HITS=$(grep -cE "CJ Foodville|cj-foodville-coffeechat|cjfoodville" "$TARGET")
[ "$HITS" = "0" ] || { echo "PHASE_FAILED: SKILL.md 회사명 박힘 잔재"; exit 1; }

echo "[2] SKILL.md Write 적용 OK"
```

### 4. 회사 자산 docs/prep → data/prep/<company-slug>/ 이동

mvp-target.json `primary.coffeechat.prep_dir` = `cj-foodville` (phase-02 마이그 결과).

```bash
cd /home/bifos/ai-nodes
mkdir -p career-os/data/prep/cj-foodville/

# 이동: docs/prep/cj-foodville-coffeechat-strategy.md → data/prep/cj-foodville/strategy.md
git mv career-os/docs/prep/cj-foodville-coffeechat-strategy.md \
       career-os/data/prep/cj-foodville/strategy.md

# 이동: docs/prep/cj-foodville-coffeechat-30min-final-checklist.md → data/prep/cj-foodville/checklist.md
git mv career-os/docs/prep/cj-foodville-coffeechat-30min-final-checklist.md \
       career-os/data/prep/cj-foodville/checklist.md

# 검증
test -f career-os/data/prep/cj-foodville/strategy.md \
  || { echo "PHASE_FAILED: data/prep/cj-foodville/strategy.md 부재"; exit 1; }
test -f career-os/data/prep/cj-foodville/checklist.md \
  || { echo "PHASE_FAILED: data/prep/cj-foodville/checklist.md 부재"; exit 1; }
test ! -f career-os/docs/prep/cj-foodville-coffeechat-strategy.md \
  || { echo "PHASE_FAILED: 원본 strategy 잔존"; exit 1; }

# docs/prep 디렉터리가 비면 rmdir
if [ -z "$(ls -A career-os/docs/prep/ 2>/dev/null)" ]; then
  rmdir career-os/docs/prep/
  echo "[3-A] 빈 docs/prep/ 제거"
fi

echo "[3] 회사 자산 이동 OK"
```

### 5. dispatcher foodville-coffeechat case 폐기

Read로 `career-os/scripts/command-router/run_now.sh` 현재 본문 확인. Edit으로 case 블록 + usage line의 `foodville-coffeechat` 제거.

```bash
cd /home/bifos/ai-nodes
# 검증
HITS=$(grep -cE "^\s*foodville-coffeechat\)" career-os/scripts/command-router/run_now.sh)
[ "$HITS" = "0" ] || { echo "PHASE_FAILED: dispatcher foodville case 잔존"; exit 1; }

# bash syntax
bash -n career-os/scripts/command-router/run_now.sh \
  || { echo "PHASE_FAILED: dispatcher bash syntax"; exit 1; }

# 남은 case (recommend-positions 1개만)
CASES=$(grep -cE "^\s*[a-z-]+\)" career-os/scripts/command-router/run_now.sh)
[ "$CASES" = "1" ] || { echo "PHASE_FAILED: dispatcher case 수 $CASES (expected 1)"; exit 1; }

echo "[4] dispatcher 정리 OK (case 1개 남음)"
```

### 6. 커밋 + commit 개수 강제

```bash
cd /home/bifos/ai-nodes
HEAD_BEFORE=$(git rev-parse HEAD)

git add career-os/.claude/skills/ \
        career-os/scripts/ \
        career-os/docs/ \
        career-os/data/prep/

git commit -m "$(cat <<'COMMIT_EOF'
refactor(career-os): skill rename interview-coffeechat-prep + dispatcher case 폐기 + docs/prep → data/prep 이동 (plan021 phase-04)

ADR-029 적용. 회사 추상화 + ADR-015 정렬 + dispatcher 정리.

rename (git mv):
- .claude/skills/cj-foodville-coffeechat-prep → interview-coffeechat-prep
- scripts/cj-foodville-coffeechat-prep → interview-coffeechat-prep

SKILL.md 갱신:
- draft 적용 (회사 불가지론 본문, 회사명 박힘 0건)
- mvp-target.json `primary.coffeechat` 객체 zod 참조 명시
- Bash로 collect_company_sites.ts 호출 패턴

자산 이동 (ADR-015 정렬 — docs는 의사결정, data는 hand-crafted hint):
- docs/prep/cj-foodville-coffeechat-strategy.md → data/prep/cj-foodville/strategy.md
- docs/prep/cj-foodville-coffeechat-30min-final-checklist.md → data/prep/cj-foodville/checklist.md
- docs/prep/ 빈 디렉터리 제거

dispatcher:
- scripts/command-router/run_now.sh: foodville-coffeechat case 제거 + usage 갱신
- 남은 dispatcher case 1개 (recommend-positions). plan022 후 plan023에서 command-router
  일괄 폐기 예정.

검증:
- SKILL.md byte-for-byte ↔ draft
- SKILL.md 회사명 박힘 0건
- dispatcher case 1개 + bash syntax OK
- data/prep/cj-foodville/{strategy,checklist}.md 존재
COMMIT_EOF
)" || { echo "PHASE_FAILED: commit"; exit 1; }

HEAD_AFTER=$(git rev-parse HEAD)
COMMITS=$(git rev-list "$HEAD_BEFORE..$HEAD_AFTER" --count)
[ "$COMMITS" = "1" ] || { echo "PHASE_FAILED: commit 수 $COMMITS"; exit 1; }
echo "[6] commit 1 OK"
```

## Critical Files

| 파일/디렉터리 | 변경 |
|---|---|
| `career-os/.claude/skills/interview-coffeechat-prep/` | git mv from `cj-foodville-coffeechat-prep` |
| `career-os/scripts/interview-coffeechat-prep/` | git mv from `cj-foodville-coffeechat-prep` |
| `career-os/.claude/skills/interview-coffeechat-prep/SKILL.md` | Write 덮어쓰기 (draft 복제) |
| `career-os/docs/prep/cj-foodville-coffeechat-*.md` | git mv → `career-os/data/prep/cj-foodville/{strategy,checklist}.md` |
| `career-os/docs/prep/` | rmdir (빈 디렉터리) |
| `career-os/scripts/command-router/run_now.sh` | foodville-coffeechat case 제거 |

## Blocked 조건

- phase-03 commit 없음 → `PHASE_BLOCKED` + `exit 2`
- 폐기 대상 부재 → `PHASE_BLOCKED: 부분 실행 의심` + `exit 2`
- 신규 위치 이미 존재 → `PHASE_BLOCKED` + `exit 2`
- 검증 1~5 실패 → `PHASE_FAILED` + `exit 1`
- commit 수 ≠ 1 → `PHASE_FAILED: commit 위장 의심` + `exit 1`

## 의도 메모

- skill rename은 *git mv 후 SKILL.md Write 덮어쓰기* — git history 따라옴.
- 회사 자산 이동 후 mvp-target.json `coffeechat.prep_dir` = `cj-foodville` 그대로 (이미 phase-02에서 설정).
- dispatcher case 1개 남음 (recommend-positions) — plan022 진행 시 폐기, plan023에서 command-router 디렉터리 자체 폐기.
