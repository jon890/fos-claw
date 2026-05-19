# Phase 01 — zod 스키마 확장 + mvp-target.json 마이그 + first_round 채움

**Model**: sonnet
**Status**: pending

---

## 목표

ADR-034 (interview-coffeechat-prep 4 mode 일반화) 적용 단계 1.

1. `_shared/lib/mvp_target_schema.ts` zod 스키마에 `InterviewModeSchema` + `InterviewSchema` 추가.
2. `career-os/config/mvp-target.json` 마이그: `primary.coffeechat` → `primary.interview.{coffeechat, first_round, final_round, offer_chat}` 구조.
3. `primary.interview.first_round` 본문 채움 — CJ Foodville 1차 면접 sites + report_slug + prep_dir 명세.

**범위 외**: SKILL.md mode 분기 (phase-02), coffeechat-prompt.md first-round 가이드 (phase-02), collect_company_sites.ts mode 인자 (phase-02), 통합 검증 + push (phase-03).

---

## 사전 cwd 설정 (run-phases.py hotfix 표준)

```bash
cd "$(git rev-parse --show-toplevel)"
pwd  # 기대: /home/bifos/ai-nodes
```

---

## 본 phase 강제 주의문

- 반드시 Write / Edit / Bash 도구로 파일을 생성·수정. prose 응답으로 종료하면 PHASE_FAILED.
- zod 스키마 변경 후 mvp-target.json 마이그 정합성 검증 — `bun run` 으로 schema parse 통과 확인 필수.
- 본 phase 종료 시 commit 개수 self-check: 1.

---

## 관련 docs

- 적용 ADR: `career-os/docs/adr.md` ADR-034
- 스키마: `career-os/docs/data-schema.md` config/mvp-target.json 섹션 (primary.interview 4 mode)

---

## 작업 항목

### 1. `_shared/lib/mvp_target_schema.ts` 스키마 확장

`Read` 도구로 현재 `_shared/lib/mvp_target_schema.ts` 본문 확인.
기존 `CoffeechatSchema` 객체는 보존.

추가:

```typescript
// InterviewModeSchema — 4 mode 공통 구조 (coffeechat과 동일 형식).
export const InterviewModeSchema = z.object({
  sites: z.array(z.object({
    key: z.string(),
    url: z.string(),
    label: z.string(),
  })),
  source_dir: z.string(),
  report_slug: z.string(),
  prep_dir: z.string(),
  strategy_filename: z.string().default("strategy.md"),
  checklist_filename: z.string().default("checklist.md"),
});

// InterviewSchema — 4 mode 컨테이너 (ADR-034, plan026).
export const InterviewSchema = z.object({
  coffeechat: InterviewModeSchema.nullable(),
  first_round: InterviewModeSchema.nullable(),
  final_round: InterviewModeSchema.nullable(),
  offer_chat: InterviewModeSchema.nullable(),
});
```

기존 `MvpTargetSchema` 의 `primary` 객체에 `interview: InterviewSchema.optional()` 추가. `coffeechat` 옛 키는 nullable 보존 (한 사이클 backward compat) — 단 본 plan 에서 mvp-target.json 마이그가 끝나면 향후 제거 검토.

기존 `parseMvpTarget()` 함수는 그대로 — schema 만 확장.

### 2. `career-os/config/mvp-target.json` 마이그

기존 `primary.coffeechat` 객체를 `primary.interview.coffeechat` 위치로 이동. 본문 동일 보존.
`primary.interview.first_round` 본문 채움 — CJ Foodville 1차 면접.
`final_round`, `offer_chat` 은 `null`.

`first_round` 본문 예시 — CJ Foodville sites는 기존 coffeechat 와 일부 공유 가능. 사용자 결정에 따라 변형. 기본 안:

```json
"first_round": {
  "sites": [
    {"key": "vips", "url": "https://www.ivips.co.kr/", "label": "VIPS"},
    {"key": "cheiljemyunso-menu", "url": "https://www.cheiljemyunso.co.kr/menu?categoryIdx=4", "label": "제일제면소 메뉴"},
    {"key": "cjfoodville-brand", "url": "https://m.cjfoodville.co.kr:7443/brand/introduce.asp", "label": "CJ푸드빌 브랜드 소개"}
  ],
  "source_dir": "cj-foodville-first-round-sites",
  "report_slug": "cj-foodville-first-round",
  "prep_dir": "cj-foodville-first-round",
  "strategy_filename": "strategy.md",
  "checklist_filename": "checklist.md"
}
```

기존 `primary.coffeechat` 위치 (top-level)는 제거. 단일 진실원은 `primary.interview.coffeechat`.

### 3. 검증

```bash
# 스키마 parse 검증 — Bun + zod로 mvp-target.json 통과 확인
bun --eval "
import { parseMvpTarget } from './_shared/lib/mvp_target_schema.ts';
const fs = await import('node:fs');
const json = JSON.parse(fs.readFileSync('career-os/config/mvp-target.json', 'utf8'));
const parsed = parseMvpTarget(json);
if (!parsed.primary.interview?.first_round) {
  console.error('PHASE_FAILED: primary.interview.first_round 누락');
  process.exit(1);
}
if (!parsed.primary.interview?.coffeechat) {
  console.error('PHASE_FAILED: primary.interview.coffeechat 마이그 누락');
  process.exit(1);
}
if (parsed.primary.coffeechat) {
  console.error('PHASE_FAILED: 옛 primary.coffeechat 잔존');
  process.exit(1);
}
console.log('[schema parse OK]');
console.log('first_round:', parsed.primary.interview.first_round.report_slug);
console.log('coffeechat:', parsed.primary.interview.coffeechat.report_slug);
" || { echo "PHASE_FAILED: zod parse 실패"; exit 1; }

# 옛 mvp-target.json 참조 grep — primary.coffeechat top-level 잔존 0 확인
LEFT_TOP=$(python3 -c "
import json
d = json.load(open('career-os/config/mvp-target.json'))
print('primary.coffeechat' if 'coffeechat' in d.get('primary', {}) else 'OK')
")
[ "$LEFT_TOP" = "OK" ] || { echo "PHASE_FAILED: primary.coffeechat top-level 잔존"; exit 1; }
echo "[mvp-target.json 마이그] OK"
```

### 4. commit

```bash
git add _shared/lib/mvp_target_schema.ts career-os/config/mvp-target.json
git commit -m "$(cat <<'COMMIT_EOF'
feat(career-os, _shared): zod schema InterviewSchema + mvp-target.json primary.interview 마이그 (plan026 phase-01)

ADR-034 적용 1/2:
- _shared/lib/mvp_target_schema.ts: InterviewModeSchema + InterviewSchema 추가 (4 mode 컨테이너, 각 nullable)
- career-os/config/mvp-target.json: primary.coffeechat → primary.interview.coffeechat 위치 이동 + primary.interview.first_round 본문 채움 (CJ Foodville 1차 면접)
- final_round / offer_chat은 null — 본 plan 범위 외, 별도 plan에서 활성화

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
COMMIT_EOF
)"

COMMITS=$(git log --format='%H' HEAD~1..HEAD | wc -l)
[ "$COMMITS" -eq 1 ] || { echo "PHASE_FAILED: phase commit $COMMITS != 1"; exit 1; }
echo "✓ Phase 01 검증 통과"
```

---

## 의도 메모

- 스키마 정의를 phase-02 SKILL.md 변경보다 먼저 — zod parse 가 SKILL.md 동작의 전제 조건.
- mvp-target.json 마이그를 옛 키 제거 포함으로 진행 — 두 출처 공존은 drift 위험 (ADR-002 단일 진실원).
- first_round 본문은 기본 안 — 사용자가 phase-02 또는 검증 단계에서 sites 조정 가능. CJ Foodville 도메인 지식은 사용자 명시.
- final_round / offer_chat 은 null — 스키마 존재로 향후 활성화 비용 ↓ (단순 객체 채움).
