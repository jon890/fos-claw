# Phase 1 — draft 작성 (SKILL.md + collect_company_sites.ts + mvp_target_schema.ts)

**Model**: sonnet
**Status**: pending

---

## 목표

ADR-029 적용을 위한 draft 3개를 별도 파일에 작성. common-pitfalls 6-6 회피.

1. `draft/SKILL.md` — interview-coffeechat-prep native 명세 (회사 불가지론)
2. `draft/collect_company_sites.ts` — Bun fetch + HTML→text collector (회사 hard-coded 제거, mvp-target.json sites 배열 Read)
3. `draft/mvp_target_schema.ts` — zod 스키마 + parseMvpTarget() 함수

## 관련 docs

- `career-os/docs/adr.md` ADR-029 — 본 plan 결정 출처
- `career-os/.claude/skills/study-pack-writer/SKILL.md` — native 명세 패턴
- `career-os/scripts/study-topic-recommender/refresh_topic_inventory.ts` — Bun fetch 패턴 (plan016)
- `career-os/scripts/cj-foodville-coffeechat-prep/collect_foodville_sites.py` — 마이그 원본
- `skills/plan-and-build/references/common-pitfalls.md` 6-6 + 6-7

## 사전 검증

```bash
cd /home/bifos/ai-nodes

# ADR-029 commit
git log --oneline | grep -q "ADR-029.*interview-coffeechat-prep" \
  || { echo "PHASE_BLOCKED: ADR-029 commit 없음"; exit 2; }

# draft 디렉터리
test -d career-os/tasks/plan021-interview-coffeechat-prep-native/draft \
  || { echo "PHASE_BLOCKED: draft 디렉터리 없음"; exit 2; }

# 마이그 원본 존재
test -f career-os/scripts/cj-foodville-coffeechat-prep/collect_foodville_sites.py \
  || { echo "PHASE_BLOCKED: 원본 Python 없음"; exit 2; }

echo "사전 검증 OK"
```

## 작업 항목

### 1. SKILL.md draft 작성

저장: `career-os/tasks/plan021-interview-coffeechat-prep-native/draft/SKILL.md`

본문 구성 (~150줄):

#### Frontmatter
```yaml
---
name: interview-coffeechat-prep
description: 면접 커피챗 준비 — 현 active 타깃 기업(mvp-target.json `primary.coffeechat`)의 회사 사이트 자동 수집 + 후보자 프로필 결합 + Claude 분석으로 비공개 전략 리포트 생성. 회사 불가지론 — 회사명은 mvp-target.json에서만 받음. "커피챗 준비", "회사 리서치", "면접 회사 분석" 같은 자연어 요청 또는 `/interview-coffeechat-prep` 슬래시. fos-study가 아닌 비공개 career-os 리포트 생성.
---
```

#### 본문 섹션 (필수)
1. **Overview** — 한 줄, 회사 불가지론 명시
2. **When to use** — 슬래시 + 자연어 + 호출 빈도
3. **Inputs** — Read 대상:
   - `career-os/config/mvp-target.json` → zod parse → `primary.coffeechat` 객체
   - `career-os/config/candidate-profile.md`
   - `career-os/data/prep/<coffeechat.prep_dir>/strategy.md` + `checklist.md`
   - `career-os/data/source/<coffeechat.source_dir>/` (collector 결과)
   - `references/coffeechat-prompt.md`
4. **Workflow** — 단계:
   - 1) mvp-target.json zod parse → coffeechat 객체 추출
   - 2) collect_company_sites.ts 호출 (Bash) — sites 배열 fetch
   - 3) candidate-profile + strategy + checklist + sites Read
   - 4) Claude 분석 → report.md 작성
   - 5) Write to `data/reports/daily/YYYY-MM-DD/<coffeechat.report_slug>/report.md` + `data/runtime/<coffeechat.report_slug>.md`
   - 6) Discord 알림
5. **Self-check** — report.md 라인 수 + 회사명 mvp-target 참조 검증
6. **Error handling** — zod parse 실패 / sites fetch 실패 / strategy 부재
7. **Why this design** — ADR-029 요약 3줄

### 2. collect_company_sites.ts draft 작성

저장: `career-os/tasks/plan021-interview-coffeechat-prep-native/draft/collect_company_sites.ts`

본문 구성 (~180줄):

```typescript
#!/usr/bin/env bun
// 회사 사이트 자동 수집 — mvp-target.json `primary.coffeechat.sites` 배열 Read.
// HTML → text 추출. 회사 hard-coded URL 없음.
//
// usage: bun collect_company_sites.ts [--outdir <dir>]
//   default outdir: data/source/<coffeechat.source_dir>/

import { parseMvpTarget } from '../../../_shared/lib/mvp_target_schema';
// ...
```

핵심 로직:
- `parseMvpTarget()` 호출 → zod 검증된 mvp-target 객체
- 각 site에 대해 `fetch(site.url)` → HTML
- HTML → text 변환 (`html-to-text` 의존성 사용 또는 stdlib parser ts 재구현)
- 출력: `<outdir>/<site.key>.html` + `<site.key>.txt` + `manifest.json`
- exit code: 모두 성공 0 / 일부 실패 1 (Python 원본과 동일)

### 3. mvp_target_schema.ts draft 작성

저장: `career-os/tasks/plan021-interview-coffeechat-prep-native/draft/mvp_target_schema.ts`

본문 구성 (~80줄):

```typescript
import { z } from 'zod';
import { readFileSync } from 'fs';

export const CoffeechatSiteSchema = z.object({
  key: z.string(),
  url: z.string().url(),
  label: z.string()
});

export const CoffeechatSchema = z.object({
  sites: z.array(CoffeechatSiteSchema),
  source_dir: z.string(),
  report_slug: z.string(),
  prep_dir: z.string(),
  strategy_filename: z.string().default('strategy.md'),
  checklist_filename: z.string().default('checklist.md')
});

export const MvpTargetPrimarySchema = z.object({
  company: z.string(),
  team: z.string(),
  role: z.string(),
  interview_date: z.string(),
  notes: z.string().optional(),
  coffeechat: CoffeechatSchema.optional()  // 옵셔널 — 모든 회사가 coffeechat skill 쓰는 건 아님
});

export const MvpTargetHistoryItemSchema = z.object({
  company: z.string(),
  team: z.string(),
  role: z.string(),
  interview_date: z.string(),
  deprecated_at: z.string(),
  notes: z.string().optional()
});

export const MvpTargetSchema = z.object({
  primary: MvpTargetPrimarySchema,
  history: z.array(MvpTargetHistoryItemSchema).default([])
});

export type MvpTarget = z.infer<typeof MvpTargetSchema>;
export type CoffeechatConfig = z.infer<typeof CoffeechatSchema>;

export function parseMvpTarget(path: string): MvpTarget {
  const raw = JSON.parse(readFileSync(path, 'utf-8'));
  return MvpTargetSchema.parse(raw);
}
```

### 4. draft 자기 확인

```bash
cd /home/bifos/ai-nodes
DRAFT=career-os/tasks/plan021-interview-coffeechat-prep-native/draft

# A. 3 draft 파일 존재
for f in SKILL.md collect_company_sites.ts mvp_target_schema.ts; do
  test -f "$DRAFT/$f" || { echo "PHASE_FAILED: draft/$f 부재"; exit 1; }
done

# B. SKILL.md 필수 섹션 + 회사 불가지론
for s in "When to use" "Inputs" "Workflow" "Self-check" "Error handling" \
         "interview-coffeechat-prep" "coffeechat" "zod\|mvp_target"; do
  grep -qE "$s" "$DRAFT/SKILL.md" || { echo "PHASE_FAILED: SKILL.md '$s' 누락"; exit 1; }
done

# C. SKILL.md에 회사명 박힘 없음 (CJ Foodville / cj-foodville 등 직접 박지 않음 — mvp-target 참조만)
HITS=$(grep -cE "CJ Foodville|cj-foodville-coffeechat|cjfoodville" "$DRAFT/SKILL.md")
[ "$HITS" = "0" ] || { echo "PHASE_FAILED: SKILL.md에 회사명 박힘 잔재"; exit 1; }

# D. mvp_target_schema.ts zod 임포트 + parseMvpTarget 함수
for kw in "import.*zod\|from 'zod'" "parseMvpTarget" "CoffeechatSchema" "MvpTargetSchema"; do
  grep -qE "$kw" "$DRAFT/mvp_target_schema.ts" || { echo "PHASE_FAILED: schema '$kw' 누락"; exit 1; }
done

# E. collect_company_sites.ts mvp_target_schema 사용 + sites 배열 처리
for kw in "parseMvpTarget\|mvp_target_schema" "coffeechat\.sites\|sites\[" "fetch"; do
  grep -qE "$kw" "$DRAFT/collect_company_sites.ts" || { echo "PHASE_FAILED: collector '$kw' 누락"; exit 1; }
done

# F. 옛 subprocess 지시문 없음 (6-7)
for kw in "Output only valid JSON" "Do not output markdown" "claude --json-schema"; do
  grep -q "$kw" "$DRAFT/SKILL.md" && { echo "PHASE_FAILED: '$kw' 잔재"; exit 1; }
done

echo "[자기 확인] 3 draft OK"
```

### 5. 커밋 + commit 개수 강제

```bash
cd /home/bifos/ai-nodes
HEAD_BEFORE=$(git rev-parse HEAD)

git add career-os/tasks/plan021-interview-coffeechat-prep-native/draft/
git commit -m "$(cat <<'COMMIT_EOF'
chore(career-os): plan021 phase-01 — interview-coffeechat-prep draft 3개 작성

ADR-029 적용 준비. draft를 phase 본문 코드 블록이 아닌 별도 파일로 분리해
common-pitfalls 6-6 (Write 위장) 회피.

- draft/SKILL.md (~150줄): interview-coffeechat-prep native 명세 (회사
  불가지론 — mvp-target.json `primary.coffeechat` 객체 참조만)
- draft/collect_company_sites.ts (~180줄): Bun fetch + HTML→text. 회사
  hard-coded URL 제거 — mvp-target sites 배열 Read
- draft/mvp_target_schema.ts (~80줄): zod 스키마 + parseMvpTarget() 함수.
  collector ts와 (향후) 다른 mvp-target Read 위치에서 공유 검증

phase-02에서 zod 의존성 추가 + mvp-target.json `primary.coffeechat` 객체
마이그 + schema 적용.
COMMIT_EOF
)" || { echo "PHASE_FAILED: commit"; exit 1; }

HEAD_AFTER=$(git rev-parse HEAD)
COMMITS=$(git rev-list "$HEAD_BEFORE..$HEAD_AFTER" --count)
[ "$COMMITS" = "1" ] || { echo "PHASE_FAILED: commit 수 $COMMITS"; exit 1; }
echo "[commit] 1 commit OK"
```

push는 phase-05.

## Critical Files

| 파일 | 변경 |
|---|---|
| `career-os/tasks/plan021-interview-coffeechat-prep-native/draft/SKILL.md` | 신규 (~150줄) |
| `career-os/tasks/plan021-interview-coffeechat-prep-native/draft/collect_company_sites.ts` | 신규 (~180줄) |
| `career-os/tasks/plan021-interview-coffeechat-prep-native/draft/mvp_target_schema.ts` | 신규 (~80줄) |

## Blocked 조건

- ADR-029 commit 없음 → `PHASE_BLOCKED` + `exit 2`
- draft 디렉터리 부재 → `PHASE_BLOCKED` + `exit 2`
- 마이그 원본 Python 부재 → `PHASE_BLOCKED` + `exit 2`
- 자기 확인 A~F 실패 → `PHASE_FAILED: <항목>` + `exit 1`
- commit 수 ≠ 1 → `PHASE_FAILED: commit 위장 의심` + `exit 1`

## 의도 메모

- SKILL.md 회사 불가지론 핵심 — *회사명 박힘 검증* (자기 확인 C)이 6-6 + 추상화 의도 동시 보호.
- mvp_target_schema.ts는 향후 다른 mvp-target Read 위치 (다른 ts script)에서 공유 — 본 plan021만 쓰는 게 아님.
