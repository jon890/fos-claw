# Phase 03 — 통합 정적 검증 + status=completed + push

**Model**: haiku
**Status**: pending

---

## 목표

phase-01 (스키마 + mvp-target.json 마이그) + phase-02 (SKILL.md + prompt + collector 분기) 통합 정적 검증 → plan026 완료 + push.

**범위 외**: live e2e (`claude -p "/interview-coffeechat-prep first-round"`) — Claude 호출 비용 발생. 사용자 명시 실행에서 자연 검증.

---

## 사전 cwd 설정 (run-phases.py hotfix 표준)

```bash
cd "$(git rev-parse --show-toplevel)"
pwd  # 기대: /home/bifos/ai-nodes
```

---

## 본 phase 강제 주의문

- 본 phase 종료 시 commit 개수 self-check: 1 (index.json status=completed).
- `git push origin main`은 본 phase 마지막에만 (마지막 phase 표준).

---

## 작업 항목

### 1. 통합 정적 검증

```bash
# 1-1. ADR-034 + Quick Index 본문 정합
grep -q "^## ADR-034" career-os/docs/adr.md || { echo "PHASE_FAILED: ADR-034 본문 부재"; exit 1; }
grep -q "| ADR-034 |" career-os/docs/adr.md || { echo "PHASE_FAILED: ADR-034 Quick Index 부재"; exit 1; }
echo "[ADR-034] OK"

# 1-2. mvp-target.json 스키마 정합 (zod parse)
bun --eval "
import { parseMvpTarget } from './_shared/lib/mvp_target_schema.ts';
const fs = await import('node:fs');
const json = JSON.parse(fs.readFileSync('career-os/config/mvp-target.json', 'utf8'));
const parsed = parseMvpTarget(json);
if (!parsed.primary.interview) {
  console.error('PHASE_FAILED: primary.interview 부재');
  process.exit(1);
}
if (!parsed.primary.interview.coffeechat) {
  console.error('PHASE_FAILED: primary.interview.coffeechat 부재');
  process.exit(1);
}
if (!parsed.primary.interview.first_round) {
  console.error('PHASE_FAILED: primary.interview.first_round 부재 (CJ Foodville 1차 면접 본문 필요)');
  process.exit(1);
}
console.log('[mvp-target.json zod parse] OK');
console.log('coffeechat slug:', parsed.primary.interview.coffeechat.report_slug);
console.log('first_round slug:', parsed.primary.interview.first_round.report_slug);
" || { echo "PHASE_FAILED: zod parse 실패"; exit 1; }

# 1-3. SKILL.md mode 분기 등록
grep -q "first-round\|first_round" career-os/.claude/skills/interview-coffeechat-prep/SKILL.md || { echo "PHASE_FAILED: SKILL.md mode 분기 누락"; exit 1; }
grep -q "report-public.md" career-os/.claude/skills/interview-coffeechat-prep/SKILL.md || { echo "PHASE_FAILED: SKILL.md public-safe 산출물 누락"; exit 1; }
echo "[SKILL.md] OK"

# 1-4. coffeechat-prompt.md first-round 가이드
grep -q "First-Round" career-os/.claude/skills/interview-coffeechat-prep/references/coffeechat-prompt.md || { echo "PHASE_FAILED: prompt first-round 가이드 누락"; exit 1; }
grep -q "Public-safe sanitize\|public-safe sanitize" career-os/.claude/skills/interview-coffeechat-prep/references/coffeechat-prompt.md || { echo "PHASE_FAILED: prompt sanitize 규칙 누락"; exit 1; }
echo "[prompt] OK"

# 1-5. collect_company_sites.ts mode 인자
grep -q "mode\|--mode" career-os/scripts/interview-coffeechat-prep/collect_company_sites.ts || { echo "PHASE_FAILED: collector mode 인자 누락"; exit 1; }
echo "[collector mode 인자] OK"

# 1-6. 옛 primary.coffeechat top-level 잔존 0
LEFT=$(python3 -c "
import json
d = json.load(open('career-os/config/mvp-target.json'))
print('LEFT' if 'coffeechat' in d.get('primary', {}) else 'OK')
")
[ "$LEFT" = "OK" ] || { echo "PHASE_FAILED: 옛 primary.coffeechat top-level 잔존"; exit 1; }
echo "[옛 primary.coffeechat top-level 잔존] 0 OK"

# 1-7. docs/data-schema.md primary.interview 명세
grep -q "primary.interview" career-os/docs/data-schema.md || { echo "PHASE_FAILED: data-schema.md primary.interview 명세 부재"; exit 1; }
echo "[data-schema] OK"

# 1-8. docs/prd.md 4 mode 기능 표
grep -q "first-round\|first_round" career-os/docs/prd.md || { echo "PHASE_FAILED: prd.md 4 mode 기능 표 미반영"; exit 1; }
echo "[prd] OK"

# 1-9. docs/flow.md mode 분기 흐름
grep -q "mode 분기\|primary.interview" career-os/docs/flow.md || { echo "PHASE_FAILED: flow.md mode 분기 흐름 누락"; exit 1; }
echo "[flow] OK"

# 1-10. docs/code-architecture.md ADR-034 cross-ref
grep -q "ADR-034" career-os/docs/code-architecture.md || { echo "PHASE_FAILED: code-architecture.md ADR-034 cross-ref 누락"; exit 1; }
echo "[code-architecture] OK"
```

### 2. index.json status=completed

`Edit` 도구로 `career-os/tasks/plan026-interview-mode-generalization/index.json` 갱신:
- `status`: `"running"` → `"completed"`
- `current_phase`: `3`
- `updated_at`: 현재 시각 (ISO 8601 UTC)

### 3. commit + push

```bash
git add career-os/tasks/plan026-interview-mode-generalization/index.json
git commit -m "$(cat <<'COMMIT_EOF'
task(career-os): plan026 index.json status=completed (phase-03)

plan026 단계 1~3 통과:
- phase-01: zod InterviewSchema + mvp-target.json primary.interview 마이그 + first_round 본문
- phase-02: SKILL.md mode 분기 + coffeechat-prompt.md First-Round 가이드 + Public-safe sanitize 규칙 + collect_company_sites.ts --mode 인자
- phase-03: 통합 정적 검증 + status=completed

ADR-034 (interview-coffeechat-prep 4 mode 일반화) 적용 완료. CJ Foodville 1차 면접 즉시 운영 가능.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
COMMIT_EOF
)"

COMMITS=$(git log --format='%H' HEAD~1..HEAD | wc -l)
[ "$COMMITS" -eq 1 ] || { echo "PHASE_FAILED: phase commit $COMMITS != 1"; exit 1; }

git push origin main || { echo "PHASE_FAILED: push 실패"; exit 1; }

echo "✓ Phase 03 검증 통과 + push 완료"
```

---

## 의도 메모

- 정적 검증만 — Claude `claude -p "/interview-coffeechat-prep first-round"` 실제 호출은 비용 발생, 사용자 시점 자연 검증.
- 본 phase 검증 10 항목 — ADR / Quick Index / mvp-target.json zod / SKILL.md / prompt / collector / 옛 키 잔존 / 5 docs.
- ts compile check 는 phase-02 에서 best-effort — 본 phase 는 grep 정적 검증만 (Bun 환경 의존 회피).
