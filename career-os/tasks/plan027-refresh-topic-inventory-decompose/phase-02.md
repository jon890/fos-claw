# Phase 02 — render/ 추출 + cli.ts 조립 + 기존 refresh_topic_inventory.ts → cli.ts 진입점 교체

**Model**: sonnet
**Status**: pending

---

## 목표

ADR-035 분해 적용 2단계 — `render/markdown.ts` 추출 + `cli.ts` 신설 (transform / render 조립 + IO) + 기존 `refresh_topic_inventory.ts` 가 `cli.ts` 를 호출하는 thin shim 또는 cli.ts 자체로 교체.

**범위 외**: 통합 검증 + status=completed + push (phase-03).

---

## 사전 cwd 설정 (run-phases.py hotfix 표준)

```bash
cd "$(git rev-parse --show-toplevel)"
pwd  # 기대: /home/bifos/ai-nodes
```

---

## 본 phase 강제 주의문

- 반드시 Write / Edit / Bash 도구로 파일 변경. prose 응답만 출력하면 PHASE_FAILED.
- render/ 함수는 *입력 → 문자열* 만 — `writeFileSync` 호출 0 건 (그것은 cli.ts 책임).
- cli.ts 가 기존 `refresh_topic_inventory.ts` 진입점 path 유지 — SKILL.md / 호출부 변경 0 (분해 컨벤션 ADR-035 명시).
- 기존 refresh_topic_inventory.ts 본문은 *전체 교체* — 옛 god-script 코드 잔재 0.
- 본 phase 종료 시 commit 개수 self-check: 1.

---

## 관련 docs

- 적용 ADR: `career-os/docs/adr.md` ADR-035

---

## 작업 항목

### 1. render/markdown.ts 추출

`Read` 도구로 기존 `career-os/scripts/study-topic-recommender/refresh_topic_inventory.ts` 의 line 576-720 (markdown rendering 영역) 확인.

다음 함수들을 `career-os/scripts/study-topic-recommender/render/markdown.ts` 로 추출:

- `renderBackendItem(idx, item: Recommendation): string[]`
- `renderSecondaryItem(...): string[]`
- 본 영역의 helper 함수들

순수성: 입력 → string[] / string 반환. `writeFileSync` / `process.argv` / `fetch` 호출 0건. import 는 `../transform/types.ts` 만 (interface).

### 2. cli.ts 조립

`career-os/scripts/study-topic-recommender/cli.ts` 신설. 본 파일이 god-script 의 *대체 진입점*.

책임:

- CLI 인자 파싱 (`--render-only` 등)
- `transform/` 함수들 호출 (`scoring`, `recommend`, `filter`)
- `render/markdown.ts` 호출 → markdown 문자열 조립
- 파일 IO (`writeFileSync` 로 `data/runtime/morning-topic-recommendation.md`, `data/runtime/topic-inventory.json` 등)
- `scanFosStudyInventory` (기존 source 영역, 본 파일에서 그대로 import) 호출
- `feed_discovery.ts` (기존 별도 source) 호출
- `duplicate_detection.ts` 호출
- console.log JSON 출력 (render-only mode)
- main entry: `if (import.meta.main) await main()`

전체 cli.ts 는 600 줄 미만이 목표 — transform/render 추출로 god-script 1049 → cli.ts 600 미만으로 슬림화.

### 3. 기존 refresh_topic_inventory.ts → cli.ts 진입점 교체

`career-os/scripts/study-topic-recommender/refresh_topic_inventory.ts` 본문 *전체 교체*. 두 옵션:

**A**: cli.ts 본문을 refresh_topic_inventory.ts 에 그대로 작성 (cli.ts 파일 자체는 없음). 단점: `cli.ts` 컨벤션 미적용.

**B (권장)**: refresh_topic_inventory.ts 를 *thin re-export shim* 으로:
```typescript
// refresh_topic_inventory.ts — entrypoint shim. 본체는 cli.ts (ADR-035 분해 컨벤션, plan027).
export * from "./cli.ts";
if (import.meta.main) {
  const { main } = await import("./cli.ts");
  await main();
}
```

**B 권장 이유**: SKILL.md / 호출부의 `refresh_topic_inventory.ts` path 인용을 유지 + 컨벤션 `cli.ts` 명시. 5 줄 shim.

본 phase는 옵션 B 진행.

### 4. 검증

```bash
# 1. render/markdown.ts 존재 + 순수성
test -f career-os/scripts/study-topic-recommender/render/markdown.ts || { echo "PHASE_FAILED: render/markdown.ts 부재"; exit 1; }
LEFT_IO=$(grep -E "writeFileSync|process\.argv|Bun\.fetch|fetch\(" career-os/scripts/study-topic-recommender/render/markdown.ts | wc -l)
[ "$LEFT_IO" -eq 0 ] || { echo "PHASE_FAILED: render/ 순수성 위반"; exit 1; }
echo "[render/markdown.ts] OK"

# 2. cli.ts 존재 + 진입점 (main / import.meta.main)
test -f career-os/scripts/study-topic-recommender/cli.ts || { echo "PHASE_FAILED: cli.ts 부재"; exit 1; }
grep -q "import.meta.main\|main()" career-os/scripts/study-topic-recommender/cli.ts || { echo "PHASE_FAILED: cli.ts main 진입점 부재"; exit 1; }
echo "[cli.ts] OK"

# 3. refresh_topic_inventory.ts shim 화 (줄 수 < 20)
LINES=$(wc -l < career-os/scripts/study-topic-recommender/refresh_topic_inventory.ts)
[ "$LINES" -lt 20 ] || { echo "PHASE_FAILED: refresh_topic_inventory.ts 슬림화 미완 ($LINES 줄)"; exit 1; }
grep -q "./cli" career-os/scripts/study-topic-recommender/refresh_topic_inventory.ts || { echo "PHASE_FAILED: shim 에 ./cli import 없음"; exit 1; }
echo "[refresh_topic_inventory.ts shim] OK ($LINES 줄)"

# 4. cli.ts 줄 수 < 600
CLI_LINES=$(wc -l < career-os/scripts/study-topic-recommender/cli.ts)
echo "[cli.ts 줄 수] $CLI_LINES"
[ "$CLI_LINES" -lt 600 ] || echo "[warn] cli.ts $CLI_LINES 줄 — 600 초과. 후속 plan 에서 추가 분해 가능."

# 5. import 체인 확인
bun --eval "
const mod = await import('./career-os/scripts/study-topic-recommender/refresh_topic_inventory.ts');
console.log('[import chain] OK', Object.keys(mod).length, '개 export');
" || { echo "PHASE_FAILED: import chain 끊김"; exit 1; }
```

### 5. commit

```bash
git add career-os/scripts/study-topic-recommender/render/ \
        career-os/scripts/study-topic-recommender/cli.ts \
        career-os/scripts/study-topic-recommender/refresh_topic_inventory.ts

git commit -m "$(cat <<'COMMIT_EOF'
refactor(career-os): study-topic-recommender render/ + cli.ts 분해 + refresh_topic_inventory shim 화 (plan027 phase-02, ADR-035)

ADR-035 분해 컨벤션 적용 완료:
- render/markdown.ts 추출 (input → string, IO 0)
- cli.ts 신설 — CLI 인자 파싱 + transform 조립 + render 호출 + 파일 IO + main entry
- refresh_topic_inventory.ts → cli.ts re-export shim (5 줄 미만)
- god-script 1049 줄 → transform (4 파일) + render (1 파일) + cli.ts + 옛 진입점 shim

SKILL.md / 호출부 변경 0 — refresh_topic_inventory.ts path 유지.

후속 plan028~031: collect_live_postings / feed_discovery / collect_company_sites / run_with_discord_notify.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
COMMIT_EOF
)"

COMMITS=$(git log --format='%H' HEAD~1..HEAD | wc -l)
[ "$COMMITS" -eq 1 ] || { echo "PHASE_FAILED: phase commit $COMMITS != 1"; exit 1; }
echo "✓ Phase 02 검증 통과"
```

---

## 의도 메모

- cli.ts 본문은 god-script 본체 가까운 크기 (~600 줄) — 분해 완료 후 transform / render 의 *호출자* + IO 책임. 추가 슬림화는 후속 plan.
- refresh_topic_inventory.ts shim 화 = backward compat 100%. SKILL.md / openclaw wrapper / 호출자 path 변경 0.
- import.meta.main 가드는 본 파일이 `bun run refresh_topic_inventory.ts` 직접 호출 시 main() 실행 — re-export 만으로는 부족.
- cli.ts 줄 수 < 600 검증은 *경고* — 초과해도 PHASE_FAILED 아님. 본 plan 의 핵심은 *분해 구조* 정착, 후속 slim 은 별도 plan.
- 검증 5번 `bun --eval` import — Bun 미설치 시 실패하지만 본 워크스페이스는 Bun 활성 (ADR-001, root `bun install`).
