# Phase 2 — 정적 검증 + push

**Model**: sonnet
**Status**: pending

---

## 목표

phase-01에서 새로 Write된 SKILL.md를 별도 phase에서 정적 검증 (라인 수 / 섹션 grep / 도구 키워드 / 3회 cap / 옛 subprocess 잔재 0). 통과하면 push. 검증과 작업을 같은 phase에 두지 않는 이유는 common-pitfalls 6-6 — 같은 phase 안에서 작업 위장 + 검증 위장이 동시 일어날 수 있다.

**범위 외**: phase-01 작업물 신뢰 가정. commitSha audit (phase-03).

## 사전 검증

```bash
cd /home/bifos/ai-nodes

# 1-A. phase-01 commit이 history에 존재
LATEST_COMMIT=$(git log -1 --format='%H %s')
echo "$LATEST_COMMIT" | grep -q "plan013-2 phase-01" \
  || { echo "PHASE_BLOCKED: phase-01 commit이 HEAD에 없음 ($LATEST_COMMIT)"; exit 2; }
echo "[사전] phase-01 commit OK: $LATEST_COMMIT"

# 1-B. target SKILL.md 존재
test -f career-os/.claude/skills/study-pack-writer/SKILL.md \
  || { echo "PHASE_BLOCKED: target SKILL.md 부재"; exit 2; }
```

## 작업 항목

### 1. 정적 검증

```bash
cd /home/bifos/ai-nodes
SKILL=career-os/.claude/skills/study-pack-writer/SKILL.md

# A. 라인 수 80~200
LINES=$(wc -l < "$SKILL")
[ "$LINES" -ge 80 ] && [ "$LINES" -le 200 ] \
  || { echo "PHASE_FAILED: SKILL.md $LINES 줄 (expected 80-200)"; exit 1; }
echo "[A] $LINES 줄 OK"

# B. frontmatter
head -5 "$SKILL" | grep -q '^name: study-pack-writer$' \
  || { echo "PHASE_FAILED: name field 누락"; exit 1; }
head -5 "$SKILL" | grep -q '^description:' \
  || { echo "PHASE_FAILED: description field 누락"; exit 1; }
echo "[B] frontmatter OK"

# C. 필수 섹션 7개
for s in "When to use" "Inputs" "Workflow" "Self-check" "Publish" "Error handling" "References"; do
  grep -q "^## .*$s\|^### .*$s" "$SKILL" \
    || { echo "PHASE_FAILED: 섹션 '$s' 누락"; exit 1; }
done
echo "[C] 7 섹션 OK"

# D. 핵심 도구 키워드 (Read / Write / Bash)
for kw in "Read" "Write" "Bash"; do
  grep -q "$kw" "$SKILL" || { echo "PHASE_FAILED: '$kw' 도구 키워드 누락"; exit 1; }
done
echo "[D] 도구 키워드 OK"

# E. self-check 3회 cap 명시
grep -q "최대 3회\|≤3회\|3회 cap" "$SKILL" \
  || { echo "PHASE_FAILED: 3회 cap 명시 누락"; exit 1; }
echo "[E] 3회 cap OK"

# F. 옛 subprocess 잔재 0건
grep -q 'claude --print\|claude --output-format' "$SKILL" \
  && { echo "PHASE_FAILED: 옛 subprocess 패턴 잔재"; exit 1; } || true
echo "[F] 옛 subprocess 잔재 0 OK"

# G. native invoke 안내 ("claude -p" 또는 슬래시 호출)
grep -q "claude -p\|/study-pack" "$SKILL" \
  || { echo "PHASE_FAILED: native invoke 안내 누락"; exit 1; }
echo "[G] native invoke 안내 OK"

echo "phase-02 정적 검증 통과"
```

### 2. push

```bash
cd /home/bifos/ai-nodes
git push origin main || { echo "PHASE_FAILED: push 실패"; exit 1; }
echo "[push] OK"
```

## Critical Files

본 phase는 검증·push만. 새 commit 생성 없음 — phase-01 commit을 그대로 푸시.

## Blocked 조건

- phase-01 commit이 HEAD에 없음 → `PHASE_BLOCKED: phase-01 미완` + `exit 2`
- target SKILL.md 부재 → `PHASE_BLOCKED: target 부재` + `exit 2`
- 검증 A~G 중 하나 실패 → `PHASE_FAILED: <항목>` + `exit 1`
- push 실패 → `PHASE_FAILED: push` + `exit 1`

## 의도 메모

- 검증을 phase-01과 분리한 이유: common-pitfalls 6-6 self-check — "검증이 같은 phase 안에 있으면 prose 위장 위험이 두 배". phase-01이 작업 + commit 자체 검증까지만, phase-02가 *외부 정적 검증* + push.
- phase-02는 새 commit을 만들지 않는다. push만. 그래서 commit 개수 검증 불필요.
