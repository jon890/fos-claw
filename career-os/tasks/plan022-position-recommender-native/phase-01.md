# Phase 1 — draft 작성 (SKILL.md + collect_live_postings.ts)

**Model**: sonnet
**Status**: pending

---

## 목표

ADR-030 적용 draft 2개를 별도 파일에 작성:
1. `draft/SKILL.md` — position-recommender native 명세 (~150줄)
2. `draft/collect_live_postings.ts` — Python (298줄) → ts 마이그 (Bun fetch + Wanted/Toss API)

draft를 phase 본문 코드 블록에 박지 않음 — common-pitfalls 6-6 회피.

## 관련 docs

- `career-os/docs/adr.md` ADR-030
- `career-os/scripts/position-recommender/collect_live_postings.py` — 마이그 원본 (298줄)
- `career-os/scripts/position-recommender/run_position_recommendation.sh` — 옛 흐름 참조
- `career-os/.claude/skills/study-pack-writer/SKILL.md` — native 명세 패턴
- `career-os/.claude/skills/cj-foodville-coffeechat-prep/SKILL.md` (plan021 결과) — 참조 패턴
- `skills/plan-and-build/references/common-pitfalls.md` 6-6 + 6-7

## 사전 검증

```bash
cd /home/bifos/ai-nodes

# ADR-030 commit
git log --oneline | grep -q "ADR-030.*position-recommender" \
  || { echo "PHASE_BLOCKED: ADR-030 commit 없음"; exit 2; }

# draft 디렉터리
test -d career-os/tasks/plan022-position-recommender-native/draft \
  || { echo "PHASE_BLOCKED: draft 디렉터리 없음"; exit 2; }

# 마이그 원본 존재
test -f career-os/scripts/position-recommender/collect_live_postings.py \
  || { echo "PHASE_BLOCKED: 원본 Python 없음"; exit 2; }

# plan021 zod schema 존재 (depends_on)
test -f _shared/lib/mvp_target_schema.ts \
  || { echo "PHASE_BLOCKED: plan021 zod schema 부재 — depends_on 미충족"; exit 2; }

echo "사전 검증 OK"
```

## 작업 항목

### 1. SKILL.md draft 작성

저장: `career-os/tasks/plan022-position-recommender-native/draft/SKILL.md`

#### Frontmatter
```yaml
---
name: position-recommender
description: 후보자 프로필·이력서·태스크 문서·채용 시장 컨텍스트를 바탕으로 적합한 포지션과 포지셔닝 전략을 추천. '내가 갈만한 포지션 추천', '지원 포지션 후보', 주기적 role-fit 추천 요청 시 사용. fos-study가 아닌 비공개 career-os 리포트.
---
```

#### 본문 섹션 (~150줄)
1. **Overview** — 한 줄
2. **When to use** — 슬래시 + 자연어 (기존 POSITION_CONTEXT/POSITION_POSTINGS_FILE env는 자연어로 흡수)
3. **Inputs**:
   - `career-os/config/candidate-profile.md`
   - `career-os/config/sources.json` (`techBlog` 필드)
   - `references/position-recommendation-prompt.md`
   - `references/position-context-index.md`
   - `references/position-decision-criteria.md`
   - `references/company-upside-reference.md`
   - `references/verified-company-research-targets.json`
   - (선택) 사용자 자연어로 지정한 채용공고 markdown 파일 path
4. **Workflow**:
   - 1) (선택적) `bun career-os/scripts/position-recommender/collect_live_postings.ts` 호출 — 사용자 자연어에 "최신 채용" / "Wanted/Toss 자동 수집" 키워드 있을 때만
   - 2) references 6 + candidate-profile + sources.json techBlog Read
   - 3) (옵션) 사용자가 지정한 채용공고 file path Read
   - 4) Claude 자연어 분석 → 마크다운 보고서 작성:
     - 첫 줄 `# `
     - 30줄+
     - 강력 추천 / 도전 추천 / 보류·주의 3 티어
     - 각 포지션: role title + 포스팅 링크 + 지원 근거 + gap 준비사항 + first action
   - 5) Write `data/reports/daily/YYYY-MM-DD/position-recommendation/report.md`
   - 6) cp → `data/runtime/position-recommendation.md`
   - 7) Discord 알림
5. **Self-check** (옛 extract_position_report.ts 흡수):
   - 첫 줄 `# ` 시작
   - 30줄+
   - 3 티어 모두 존재
6. **Error handling**:
   - references 파일 부재 → stderr + exit 1
   - Claude 호출 실패 → stderr + exit 1
   - self-check 실패 → 재작성 ≤3회
7. **Why this design** — ADR-030 요약

### 2. collect_live_postings.ts draft 작성

저장: `career-os/tasks/plan022-position-recommender-native/draft/collect_live_postings.ts`

Python 298줄 → ts. 주요 변환:
- `requests` → Bun built-in `fetch`
- `dataclass` → TypeScript interface
- `argparse` → process.argv 파싱
- `re` 정규식 그대로
- HTML escape → `html-entities` 또는 stdlib 처리

핵심 동작 보존:
- Wanted 공개 navigation/jobs API (URL은 Python 원본과 동일)
- Toss career public post API
- SERVER_KEYWORDS + EXCLUDE_NON_SERVER_KEYWORDS 필터링
- markdown 출력 (Claude position recommender 입력용)

usage:
```bash
bun collect_live_postings.ts --output <output-md> [--max-wanted N] [--max-toss N]
```

### 3. draft 자기 확인

```bash
cd /home/bifos/ai-nodes
DRAFT=career-os/tasks/plan022-position-recommender-native/draft

# A. 2 draft 존재
for f in SKILL.md collect_live_postings.ts; do
  test -f "$DRAFT/$f" || { echo "PHASE_FAILED: draft/$f 부재"; exit 1; }
done

# B. SKILL.md 필수 섹션
for s in "When to use" "Inputs" "Workflow" "Self-check" "Error handling" \
         "position-recommender" "references"; do
  grep -q "$s" "$DRAFT/SKILL.md" || { echo "PHASE_FAILED: SKILL.md '$s' 누락"; exit 1; }
done

# C. SKILL.md 3 티어 명시
for t in "강력 추천" "도전 추천" "보류"; do
  grep -q "$t" "$DRAFT/SKILL.md" || { echo "PHASE_FAILED: 티어 '$t' 누락"; exit 1; }
done

# D. collect_live_postings.ts 핵심 키워드 (Wanted/Toss + fetch + filter)
for kw in "Wanted\|wanted" "Toss\|toss" "fetch" "SERVER_KEYWORDS\|server_keywords"; do
  grep -qE "$kw" "$DRAFT/collect_live_postings.ts" || { echo "PHASE_FAILED: collector '$kw' 누락"; exit 1; }
done

# E. SKILL.md 옛 env 잔재 없음 (자연어 흡수)
HITS=$(grep -cE "POSITION_CONTEXT=|POSITION_POSTINGS_FILE=" "$DRAFT/SKILL.md")
[ "$HITS" = "0" ] || { echo "PHASE_FAILED: 옛 env 패턴 잔재"; exit 1; }

# F. 옛 subprocess 지시문 없음 (6-7)
for kw in "Output only valid JSON" "Do not output markdown" "claude --json-schema"; do
  grep -q "$kw" "$DRAFT/SKILL.md" && { echo "PHASE_FAILED: '$kw' 잔재"; exit 1; }
done

echo "[자기 확인] 2 draft OK"
```

### 4. 커밋 + commit 개수 강제

```bash
cd /home/bifos/ai-nodes
HEAD_BEFORE=$(git rev-parse HEAD)

git add career-os/tasks/plan022-position-recommender-native/draft/
git commit -m "$(cat <<'COMMIT_EOF'
chore(career-os): plan022 phase-01 — position-recommender SKILL.md + collect_live_postings.ts draft 작성

ADR-030 적용 준비. draft를 phase 본문 코드 블록이 아닌 별도 파일로 분리해
common-pitfalls 6-6 회피.

- draft/SKILL.md (~150줄): native 명세 (references 6 + profile +
  sources.json techBlog Read → Claude 자연어 분석 → 3 티어 보고서).
  옛 env (POSITION_CONTEXT / POSITION_POSTINGS_FILE) → 자연어 인자 흡수
- draft/collect_live_postings.ts: Python 298줄 → Bun fetch (Wanted + Toss
  API 그대로). SERVER_KEYWORDS 필터링 보존

phase-02에서 ts 적용 + 동등성 검증 + Python 폐기.
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
| `career-os/tasks/plan022-position-recommender-native/draft/SKILL.md` | 신규 (~150줄) |
| `career-os/tasks/plan022-position-recommender-native/draft/collect_live_postings.ts` | 신규 (~300줄) |

## Blocked 조건

- ADR-030 commit 없음 → `PHASE_BLOCKED` + `exit 2`
- 마이그 원본 부재 → `PHASE_BLOCKED` + `exit 2`
- plan021 zod schema 부재 → `PHASE_BLOCKED: depends_on` + `exit 2`
- 자기 확인 A~F 실패 → `PHASE_FAILED` + `exit 1`
- commit 수 ≠ 1 → `PHASE_FAILED: commit 위장 의심` + `exit 1`

## 의도 메모

- SKILL.md 3 티어 (강력 추천 / 도전 추천 / 보류) 보존이 *기존 산출물 형식과 동등*.
- collect_live_postings.ts는 *지금 활성화* — Python deferred 시절보다 진보. ts 마이그가 활성화의 디딤돌.
