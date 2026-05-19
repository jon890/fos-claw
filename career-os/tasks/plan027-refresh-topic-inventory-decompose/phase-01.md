# Phase 01 — transform/ 디렉터리 추출 (scoring + 필터 + 추천 알고리즘 순수 함수)

**Model**: sonnet
**Status**: pending

---

## 목표

ADR-035 (ts 헬퍼 모듈 분해 컨벤션) 첫 적용 — `career-os/scripts/study-topic-recommender/refresh_topic_inventory.ts` (1049 줄) 의 *순수 함수* 영역을 `career-os/scripts/study-topic-recommender/transform/` 디렉터리로 추출.

**범위 외**: render/ 추출 + cli.ts 진입점 교체 (phase-02), 통합 검증 + push (phase-03).

---

## 사전 cwd 설정 (run-phases.py hotfix 표준)

```bash
cd "$(git rev-parse --show-toplevel)"
pwd  # 기대: /home/bifos/ai-nodes
```

---

## 본 phase 강제 주의문

- 반드시 Write / Edit / Bash 도구로 파일 생성·수정. prose 응답만 출력하면 PHASE_FAILED.
- transform 함수는 *순수* — 외부 IO (writeFileSync / readFileSync / fetch) 호출 0건. 검증.
- 기존 refresh_topic_inventory.ts 본문은 본 phase 에서 *수정 안 함* (phase-02 에서 cli.ts 로 교체). transform/ 만 신설 + 함수 본문 *복사*.
- 본 phase 종료 시 commit 개수 self-check: 1.

---

## 관련 docs

- 적용 ADR: `career-os/docs/adr.md` ADR-035 (분해 컨벤션 4 레이어)

---

## 작업 항목

### 1. 추출 대상 함수 식별

`Read` 도구로 `career-os/scripts/study-topic-recommender/refresh_topic_inventory.ts` 본문 읽고 다음 영역 식별:

- 스코어링 (WEAK_AREA_BONUS / RECENT_PENALTY_PER / CARRYOVER_PENALTY 등 상수 + 함수)
- 추천 알고리즘 (backend / tech blog / AI / geek 슬롯 + cooldown)
- 필터·정규화 (`StudyTopicEntry` interface + recent article URL 필터 등)
- duplicate detection 통합 (`duplicate_detection.ts` 의존성 호출)

외부 IO (`writeFileSync` / `readFileSync` / `console.log` / `process.argv` / fetch) 호출이 *있는* 함수는 제외 — 그것들은 render/cli 책임.

### 2. transform/ 디렉터리 + 파일 신설

다음 구조로 분리 (실제 파일 분리는 사용자 / 실행 세션 판단으로 조정 가능 — *최소* 분리 안):

```
career-os/scripts/study-topic-recommender/transform/
  scoring.ts       # 스코어링 함수 + 상수 (WEAK_AREA_BONUS, RECENT_PENALTY_PER, ...)
  recommend.ts     # 추천 알고리즘 (backend / tech_blog / ai / geek 슬롯 선택)
  filter.ts        # 필터·정규화 (recent article URL 필터, weak area 매칭)
  types.ts         # StudyTopicEntry, Recommendation 등 interface
```

각 파일은 *export* 된 순수 함수만. import 는 `node:` builtin 금지, `fs` 금지, fetch 금지.

기존 refresh_topic_inventory.ts 의 함수 본문을 *복사*. 본 phase 에서는 *기존 파일은 안 건드림* — phase-02 에서 cli.ts 가 transform/ 을 import 하도록 교체.

### 3. 검증

```bash
# 1. transform/ 디렉터리 + 파일 4개 존재
test -d career-os/scripts/study-topic-recommender/transform || { echo "PHASE_FAILED: transform/ 부재"; exit 1; }
for f in scoring recommend filter types; do
  test -f "career-os/scripts/study-topic-recommender/transform/$f.ts" || { echo "PHASE_FAILED: transform/$f.ts 부재"; exit 1; }
done
echo "[transform/ 4 파일] OK"

# 2. 순수성 검증 — transform/ 안 파일에 IO / fetch 호출 0건
LEFT_IO=$(grep -rE "writeFileSync|readFileSync|Bun\.fetch|process\.argv|console\.log|fetch\(" career-os/scripts/study-topic-recommender/transform/ | wc -l)
[ "$LEFT_IO" -eq 0 ] || { echo "PHASE_FAILED: transform/ 순수성 위반 — IO/fetch $LEFT_IO 건"; grep -rnE "writeFileSync|readFileSync|Bun\.fetch|process\.argv|console\.log|fetch\(" career-os/scripts/study-topic-recommender/transform/; exit 1; }
echo "[transform/ 순수성] OK"

# 3. ts 컴파일 best-effort
bun --eval "
import('./career-os/scripts/study-topic-recommender/transform/scoring.ts');
import('./career-os/scripts/study-topic-recommender/transform/recommend.ts');
import('./career-os/scripts/study-topic-recommender/transform/filter.ts');
import('./career-os/scripts/study-topic-recommender/transform/types.ts');
console.log('[transform import] OK');
" || { echo "PHASE_FAILED: transform import 실패"; exit 1; }
```

### 4. commit

```bash
git add career-os/scripts/study-topic-recommender/transform/
git commit -m "$(cat <<'COMMIT_EOF'
refactor(career-os): study-topic-recommender transform/ 추출 (plan027 phase-01, ADR-035)

refresh_topic_inventory.ts (1049 줄) 순수 함수 영역 분리:
- transform/scoring.ts — 스코어링 함수 + 상수
- transform/recommend.ts — 추천 알고리즘 (4 슬롯)
- transform/filter.ts — 필터·정규화
- transform/types.ts — StudyTopicEntry, Recommendation 등 interface

기존 refresh_topic_inventory.ts 본문은 본 phase 에서 *유지* — phase-02 에서 cli.ts 로 교체. transform/ 은 import 가능 상태이지만 호출부 아직 옛 파일.

순수성: transform/ 안 파일에 writeFileSync / fetch / process.argv / console.log 호출 0 건. 단위 테스트 진입점 확보.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
COMMIT_EOF
)"

COMMITS=$(git log --format='%H' HEAD~1..HEAD | wc -l)
[ "$COMMITS" -eq 1 ] || { echo "PHASE_FAILED: phase commit $COMMITS != 1"; exit 1; }
echo "✓ Phase 01 검증 통과"
```

---

## 의도 메모

- 분해 1단계는 *추출만* — 기존 파일은 phase-02 까지 그대로. 분해 안전성 점진.
- transform/ 4 파일 = 최소 분리. 실제 사용 단계에서 파일 더 쪼개거나 합칠 수 있음. ADR-035 는 *4 레이어* 만 규정, 내부 파일 수는 자유.
- 순수성 검증 (grep IO 호출 0) — transform 단위 테스트 가능성의 핵심 보장.
- refresh_topic_inventory.ts 1049 줄에는 source 영역이 거의 없음 (`scanFosStudyInventory` 가 별도 파일에 있음). 따라서 source/ 디렉터리는 본 plan에서 신설 안 함.
