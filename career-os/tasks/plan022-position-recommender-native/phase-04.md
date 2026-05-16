# Phase 4 — 5문서 + AGENTS.md 갱신 (flow.md ASCII flow + dispatcher case 0개 명시)

**Model**: sonnet
**Status**: pending

---

## 목표

plan022 변경 (position-recommender native + collect_live_postings ts + 4 자산 폐기 + dispatcher case 0)을 5문서 + AGENTS.md에 반영.

## 사전 검증

```bash
cd /home/bifos/ai-nodes

# phase-03 commit
git log -1 --format='%s' | grep -q "plan022 phase-03" \
  || { echo "PHASE_BLOCKED: phase-03 commit 없음"; exit 2; }

# 핵심 산출물
test -f career-os/.claude/skills/position-recommender/SKILL.md \
  || { echo "PHASE_BLOCKED: SKILL.md 부재"; exit 2; }
test -f career-os/scripts/position-recommender/collect_live_postings.ts \
  || { echo "PHASE_BLOCKED: ts collector 부재"; exit 2; }

echo "사전 검증 OK"
```

## 작업 항목

### 1. docs 갱신

#### 1-A. prd.md 기능 표

- `recommend-positions` (dispatcher) 행 제거
- `/position-recommender` (native) 행 추가:
  - 산출물: `data/runtime/position-recommendation.md` + `data/reports/daily/YYYY-MM-DD/position-recommendation/report.md`
  - 외부 git push: 없음 (비공개)
  - 빈도: 매일 (가장 활성, 36회/30일)

#### 1-B. flow.md

기존 `recommend-positions` 섹션을 *position-recommender (native)* 섹션으로 갱신. ASCII flow:

```
호출: claude -p "/position-recommender [자연어 컨텍스트] [채용공고 file path]"
  ↓
[선택적] Bash: bun career-os/scripts/position-recommender/collect_live_postings.ts
  → /tmp/live-postings-<date>.md (Wanted + Toss 자동 수집)
  ↓
Read:
  - config/candidate-profile.md
  - config/sources.json (techBlog 필드)
  - references/position-recommendation-prompt.md
  - references/position-context-index.md
  - references/position-decision-criteria.md
  - references/company-upside-reference.md
  - references/verified-company-research-targets.json
  - (선택) 사용자 자연어로 지정한 채용공고 file
  ↓
Claude 자연어 분석:
  - 강력 추천 / 도전 추천 / 보류·주의 3 티어
  - role title + posting 링크 + 지원 근거 + gap + first action
  ↓
Self-check: 첫 줄 # + 30줄+ + 3 티어 모두 존재 (재작성 ≤3회)
  ↓
Write: data/reports/daily/YYYY-MM-DD/position-recommendation/report.md
       data/runtime/position-recommendation.md (cp 사본)
  ↓
Discord 알림 [완료]
```

#### 1-C. code-architecture.md

- `scripts/position-recommender/` 트리: collect_live_postings.py + extract_position_report.ts + publish_job_analysis.sh + run_position_recommendation.sh → **모두 제거** + `collect_live_postings.ts` 추가
- `.claude/skills/position-recommender/SKILL.md` (native 명세로 재작성)
- dispatcher 트리: command-router/run_now.sh **case 0개** 명시 (plan023에서 디렉터리 자체 폐기 예정)

#### 1-D. data-schema.md

- 변경 없음 (산출물 위치 동일)

#### 1-E. AGENTS.md

- dispatcher 명령: 1 → **0개**. native skill 진입점 6개 → 7개 (`/position-recommender` 추가).
- "dispatcher (run_now.sh) 점진 폐기" → "**dispatcher case 0개 도달**. plan023에서 command-router 디렉터리 자체 폐기 예정" 표기.

### 2. 자기 확인

```bash
cd /home/bifos/ai-nodes

# A. 옛 활성 자산 잔재 0 (history mention 제외)
for kw in "run_position_recommendation\.sh" "extract_position_report\.ts" "publish_job_analysis\.sh" \
          "collect_live_postings\.py"; do
  HITS=$(grep -rln "$kw" career-os/.claude/skills/ career-os/scripts/ _shared/ 2>/dev/null | wc -l)
  [ "$HITS" = "0" ] || { echo "PHASE_FAILED: '$kw' 잔재 $HITS"; exit 1; }
done
echo "[A] 옛 자산 잔재 0 OK"

# B. docs에 /position-recommender native 안내 추가
for d in prd flow code-architecture; do
  grep -qE "position-recommender.*native|/position-recommender" "career-os/docs/$d.md" \
    || { echo "PHASE_FAILED: docs/$d.md 안내 누락"; exit 1; }
done
grep -q "/position-recommender" career-os/AGENTS.md \
  || { echo "PHASE_FAILED: AGENTS.md 안내 누락"; exit 1; }
echo "[B] docs 갱신 OK"

# C. AGENTS.md에 dispatcher case 0 명시
grep -qE "dispatcher.*0개|0개 dispatcher|case 0|0 case" career-os/AGENTS.md \
  || { echo "PHASE_FAILED: AGENTS.md case 0개 명시 누락"; exit 1; }
echo "[C] case 0 명시 OK"
```

### 3. 커밋 + commit 개수 강제

```bash
cd /home/bifos/ai-nodes
HEAD_BEFORE=$(git rev-parse HEAD)

git add career-os/AGENTS.md career-os/docs/

git commit -m "$(cat <<'COMMIT_EOF'
docs(career-os): position-recommender 5문서 + AGENTS.md 갱신 (plan022 phase-04)

ADR-030 적용 후속 docs 정리.

- prd.md: recommend-positions (dispatcher) → /position-recommender (native)
  행 갱신
- flow.md: ASCII flow 박기 (선택적 collector ts → references 6 Read →
  Claude 자연어 분석 → 3 티어 보고서 → Self-check ≤3회)
- code-architecture.md: scripts/position-recommender/ 트리에서 옛 자산 4개
  제거 + collect_live_postings.ts 추가. dispatcher case 0개 명시
- AGENTS.md: dispatcher 1 → 0개. native skill 진입점 6 → 7개 추가.
  plan023에서 command-router 디렉터리 자체 폐기 예정 명시

native 진입점 누적 7개: study-pack-writer + interview-asset-writer +
study-topic-recommender + interview-prep-analyzer + candidate-baseline-suggester
+ interview-coffeechat-prep + position-recommender.
COMMIT_EOF
)" || { echo "PHASE_FAILED: commit"; exit 1; }

HEAD_AFTER=$(git rev-parse HEAD)
COMMITS=$(git rev-list "$HEAD_BEFORE..$HEAD_AFTER" --count)
[ "$COMMITS" = "1" ] || { echo "PHASE_FAILED: commit 수 $COMMITS"; exit 1; }
echo "[3] commit 1 OK"
```

## Critical Files

| 파일 | 변경 |
|---|---|
| `career-os/AGENTS.md` | dispatcher 0 + native 7개 |
| `career-os/docs/prd.md` | 기능 표 |
| `career-os/docs/flow.md` | ASCII flow 박기 |
| `career-os/docs/code-architecture.md` | 트리 갱신 |

## Blocked 조건

- phase-03 commit 없음 → `PHASE_BLOCKED` + `exit 2`
- 핵심 산출물 부재 → `PHASE_BLOCKED` + `exit 2`
- 자기 확인 A~C 실패 → `PHASE_FAILED` + `exit 1`
- commit 수 ≠ 1 → `PHASE_FAILED` + `exit 1`

## 의도 메모

- dispatcher case 0개 도달은 *역사적 사건* — AGENTS.md에 명시.
- ASCII flow 박기는 사용자 의도 (코드 안 보고 docs로 흐름 이해).
