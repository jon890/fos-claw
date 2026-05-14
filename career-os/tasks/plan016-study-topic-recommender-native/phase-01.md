# Phase 1 — draft 작성 (refresh_topic_inventory.ts + feed_discovery.ts + SKILL.md draft 별도 파일)

**Model**: sonnet
**Status**: pending

---

## 목표

ADR-026 적용을 위한 draft 3개를 별도 파일에 작성:
1. `career-os/scripts/study-topic-recommender/refresh_topic_inventory.py` (622줄) → `draft/refresh_topic_inventory.ts` 마이그
2. `career-os/scripts/study-topic-recommender/feed_discovery.py` → `draft/feed_discovery.ts` 마이그
3. `career-os/.claude/skills/study-topic-recommender/SKILL.md` (현재 35줄, 옛 사람용) → `draft/SKILL.md` (native 명세 ~150줄)

draft를 phase 본문 코드 블록에 박지 않음 — common-pitfalls 6-6 회피.

**범위 외**: 실제 적용 (phase-02), dispatcher case 폐기 (phase-03), docs 갱신 (phase-04).

## 관련 docs (실행 전 필수 읽기)

- `career-os/docs/adr.md` ADR-026 — 본 plan 결정 출처
- `career-os/scripts/study-topic-recommender/refresh_topic_inventory.py` — 622줄 원본 (ts 마이그 입력)
- `career-os/scripts/study-topic-recommender/feed_discovery.py` — RSS 파서 원본
- `career-os/.claude/skills/study-pack-writer/SKILL.md` — native 명세 패턴 참고 (plan013-2 결과물)
- `career-os/.claude/skills/interview-asset-writer/SKILL.md` — native 명세 패턴 참고 (plan015 결과물)
- `skills/plan-and-build/references/common-pitfalls.md` 6-6 + 6-7

## 사전 검증

```bash
cd /home/bifos/ai-nodes

# 1-A. 원본 Python 파일 존재
for f in refresh_topic_inventory.py feed_discovery.py; do
  test -f "career-os/scripts/study-topic-recommender/$f" \
    || { echo "PHASE_BLOCKED: 원본 $f 없음"; exit 2; }
done

# 1-B. draft 디렉터리 존재
test -d career-os/tasks/plan016-study-topic-recommender-native/draft \
  || { echo "PHASE_BLOCKED: draft 디렉터리 없음"; exit 2; }

# 1-C. Bun 설치 확인
which bun >/dev/null 2>&1 || { echo "PHASE_BLOCKED: bun 미설치"; exit 2; }

echo "사전 검증 OK"
```

## 작업 항목

### 1. refresh_topic_inventory.py → ts 마이그 draft 작성

`career-os/scripts/study-topic-recommender/refresh_topic_inventory.py` 622줄을 Read해서 *결정론 동등 ts*로 마이그.

저장: `career-os/tasks/plan016-study-topic-recommender-native/draft/refresh_topic_inventory.ts`

마이그 원칙:
- **알고리즘 동등**: 점수 매기기 (RECENT_PENALTY_PER / RECENT_KEY_PENALTY_PER / WEAK_AREA_BONUS / TAG_PRIORITY / CARRYOVER_PENALTY), mix target (3 backend + 3 tech-blog + 3 AI + 1 geek), cooldown 로직 모두 ts에 동일하게.
- **입출력 호환**: `data/runtime/topic-inventory.json` + `morning-topic-recommendation.md` + `topic-inventory-history.jsonl` 스키마 그대로 (사용자 결정: 최소 개선만, history 호환 유지).
- **타입 추가**: TopicItem, BackendItem, Recommendation 등 ts interface 정의.
- **외부 의존**: `feed_discovery.ts` import (RSS 파싱은 별도 모듈).
- **Bun 표준**: `_shared/lib`의 ts 스타일 따름 (Bun runtime, ESM import).
- 마지막에 stdout JSON output (Python 원본과 동일 형식).

### 2. feed_discovery.py → ts 마이그 draft 작성

Python `feed_discovery.py`를 Read해서 ts로. RSS/Atom XML 파싱은 `fast-xml-parser` 의존 (phase-02에서 npm install).

저장: `career-os/tasks/plan016-study-topic-recommender-native/draft/feed_discovery.ts`

마이그 원칙:
- HTTP fetch (Bun `fetch`)
- RSS/Atom XML 파싱 (`fast-xml-parser` import)
- 캐시 디렉터리 (`data/runtime/feed-cache/`) 그대로 사용
- discovered article 목록 반환 (Python 원본과 동일 형식)

### 3. SKILL.md native 명세 draft 작성

저장: `career-os/tasks/plan016-study-topic-recommender-native/draft/SKILL.md`

본문 구성 (~150줄):

#### Frontmatter
```yaml
---
name: study-topic-recommender
description: backend 면접 준비용 morning 학습 토픽 추천 + RSS feed 기반 풀 보충 + 학습 완료 토픽 자동 promote + live-coding seed 선택까지 통합 처리하는 native skill. "오늘 뭐 공부할까" / "morning recommend" / "토픽 풀 갱신" / "live-coding 1개 골라줘" 같은 자연어 요청 또는 `/study-topic-recommender` 슬래시 호출. 호출 시마다 replenish + recommend + promote 자동 진행. 트리거 시점 정책은 외부 (openclaw 스케줄러).
---
```

#### 본문 섹션
1. **Overview** — 한 줄
2. **When to use** — 슬래시 / 자연어 패턴
3. **Inputs** — Read해야 할 자산 (config/topics.json + sources.json + study-progress.json + history.jsonl + live-coding-seed-pool 등)
4. **Workflow** — 자동 흐름:
   - 1) **Promote 자동 detect**: history.jsonl에서 최근 추천된 study-pack-candidates 키 중 `sources/fos-study/<outputPath>.md` 존재하는 것은 자동 candidate → study-pack namespace 승격
   - 2) **Replenish** (RSS feed 발견): `Bash`로 ts script 호출 → topic-profile 매칭 + candidates 보충 + feed-cache 활용
   - 3) **Recommend** (10픽 + 오늘의 3선): `Bash`로 refresh_topic_inventory.ts 호출 → topic-inventory.json + morning-topic-recommendation.md 갱신
   - 4) **Live-coding seed 선택** (옵션): 자연어에 "live-coding" 키워드 있으면 seed pool에서 1개 선택 → study-pack-writer로 위임 안내
5. **Self-check** — ts 산출물 검증 (topic-inventory.json 필수 키 + morning-topic-recommendation.md 비어있지 않음)
6. **Error handling** — RSS 실패 (feed-cache 활용) / ts script 실패 / candidate 없음
7. **Why this design** — 결정 근거 (ADR-026 요약 3줄)

#### 호출 흐름

```bash
# Promote auto-detect
bun --env-file=career-os/.env career-os/scripts/study-topic-recommender/detect_and_promote.ts

# Replenish + recommend (한 ts script로 통합)
bun --env-file=career-os/.env career-os/scripts/study-topic-recommender/refresh_topic_inventory.ts

# 결과 출력
cat career-os/data/runtime/morning-topic-recommendation.md
```

### 4. draft 자기 확인

```bash
cd /home/bifos/ai-nodes
DRAFT=career-os/tasks/plan016-study-topic-recommender-native/draft

# A. 3 draft 파일 존재
for f in refresh_topic_inventory.ts feed_discovery.ts SKILL.md; do
  test -f "$DRAFT/$f" || { echo "PHASE_FAILED: draft/$f 부재"; exit 1; }
done

# B. ts draft 라인 수 (대략 동등 크기)
TS_LINES=$(wc -l < "$DRAFT/refresh_topic_inventory.ts")
[ "$TS_LINES" -ge 400 ] || { echo "PHASE_FAILED: ts draft $TS_LINES 줄 (expected ≥400)"; exit 1; }

# C. SKILL.md draft 필수 섹션
SKILL_DRAFT="$DRAFT/SKILL.md"
for s in "When to use" "Inputs" "Workflow" "Self-check" "Error handling"; do
  grep -q "$s" "$SKILL_DRAFT" || { echo "PHASE_FAILED: SKILL.md draft 섹션 '$s' 누락"; exit 1; }
done

# D. ts draft에 핵심 알고리즘 키워드
for kw in "RECENT_PENALTY" "WEAK_AREA_BONUS" "TAG_PRIORITY" "mix" "cooldown\|recent"; do
  grep -qE "$kw" "$DRAFT/refresh_topic_inventory.ts" \
    || { echo "PHASE_FAILED: ts draft 알고리즘 키워드 '$kw' 누락"; exit 1; }
done

echo "[자기 확인] draft 3 파일 + 라인 수 + 섹션 + 키워드 모두 OK"
```

### 5. 커밋 + commit 개수 강제

```bash
cd /home/bifos/ai-nodes
HEAD_BEFORE=$(git rev-parse HEAD)

git add career-os/tasks/plan016-study-topic-recommender-native/draft/
git commit -m "$(cat <<'COMMIT_EOF'
chore(career-os): plan016 phase-01 — refresh_topic_inventory.ts + feed_discovery.ts + SKILL.md draft 작성

ADR-026 적용 준비. draft를 phase 본문 코드 블록이 아닌 별도 파일로
분리해 common-pitfalls 6-6 (Write 위장) 회피.

- draft/refresh_topic_inventory.ts: Python 622줄 → ts 결정론 동등 마이그
  (점수 / mix target / cooldown 알고리즘 그대로)
- draft/feed_discovery.ts: RSS/Atom 파서, fast-xml-parser 의존
- draft/SKILL.md: native 명세 ~150줄 (Bash로 ts 호출 + Claude 자연어 hybrid)

phase-02에서 적용 + 동등성 검증 (Python vs ts 출력 diff = 0).
COMMIT_EOF
)" || { echo "PHASE_FAILED: commit"; exit 1; }

HEAD_AFTER=$(git rev-parse HEAD)
COMMITS=$(git rev-list "$HEAD_BEFORE..$HEAD_AFTER" --count)
[ "$COMMITS" = "1" ] \
  || { echo "PHASE_FAILED: 본 phase commit 수 $COMMITS (expected 1)"; exit 1; }
echo "[commit] 1 commit OK"
```

push는 phase-04.

## Critical Files

| 파일 | 변경 |
|---|---|
| `career-os/tasks/plan016-study-topic-recommender-native/draft/refresh_topic_inventory.ts` | 신규 |
| `career-os/tasks/plan016-study-topic-recommender-native/draft/feed_discovery.ts` | 신규 |
| `career-os/tasks/plan016-study-topic-recommender-native/draft/SKILL.md` | 신규 |

## Blocked 조건

**중요 — exit code 명시**: 본문의 모든 검증 bash 블록은 반드시 Bash 도구로 직접 실행. prose로 마커만 출력하면 success로 잘못 처리 (common-pitfalls 6-1).

- 원본 Python 부재 → `PHASE_BLOCKED: 원본 부재` + `exit 2`
- draft 디렉터리 부재 → `PHASE_BLOCKED: draft 디렉터리 없음` + `exit 2`
- Bun 미설치 → `PHASE_BLOCKED: bun 미설치` + `exit 2`
- 자기 확인 A~D 실패 → `PHASE_FAILED: <항목>` + `exit 1`
- commit 수 ≠ 1 → `PHASE_FAILED: commit 위장 의심` + `exit 1`

## 의도 메모

- 622줄 Python → ts 마이그가 본 phase의 *결정론 핵심*. 알고리즘 동등 우선.
- SKILL.md draft는 study-pack-writer (plan013-2) + interview-asset-writer (plan015) 패턴 따름.
- ts script 이름은 *Python 원본과 동일* (`.py` → `.ts`만 변경) — phase-02에서 git rm + git mv 간단.
