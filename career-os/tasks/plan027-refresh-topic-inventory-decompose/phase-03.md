# Phase 03 — 통합 정적 검증 + status=completed + push

**Model**: haiku
**Status**: pending

---

## 목표

phase-01 (transform/ 추출) + phase-02 (render/ + cli.ts + shim) 통합 정적 검증 → plan027 완료 + push.

**범위 외**: live e2e (`claude -p "/study-topic-recommender"` 또는 `bun refresh_topic_inventory.ts` 직접 실행) — 다음 morning 실행에서 자연 검증.

---

## 사전 cwd 설정 (run-phases.py hotfix 표준)

```bash
cd "$(git rev-parse --show-toplevel)"
pwd  # 기대: /home/bifos/ai-nodes
```

---

## 본 phase 강제 주의문

- 본 phase 종료 시 commit 개수 self-check: 1 (index.json status=completed).
- `git push origin main`은 본 phase 마지막에만.

---

## 작업 항목

### 1. 통합 정적 검증

```bash
# 1-1. ADR-035 본문 + Quick Index
grep -q "^## ADR-035" career-os/docs/adr.md || { echo "PHASE_FAILED: ADR-035 본문 부재"; exit 1; }
grep -q "| ADR-035 |" career-os/docs/adr.md || { echo "PHASE_FAILED: ADR-035 Quick Index 부재"; exit 1; }
echo "[ADR-035] OK"

# 1-2. transform/ 4 파일
for f in scoring recommend filter types; do
  test -f "career-os/scripts/study-topic-recommender/transform/$f.ts" || { echo "PHASE_FAILED: transform/$f.ts 부재"; exit 1; }
done
echo "[transform/ 4 파일] OK"

# 1-3. transform/ 순수성
LEFT_IO=$(grep -rE "writeFileSync|readFileSync|Bun\.fetch|process\.argv|console\.log|fetch\(" career-os/scripts/study-topic-recommender/transform/ | wc -l)
[ "$LEFT_IO" -eq 0 ] || { echo "PHASE_FAILED: transform/ 순수성 위반 $LEFT_IO 건"; exit 1; }
echo "[transform/ 순수성] OK"

# 1-4. render/markdown.ts 존재 + 순수성
test -f career-os/scripts/study-topic-recommender/render/markdown.ts || { echo "PHASE_FAILED: render/markdown.ts 부재"; exit 1; }
LEFT_IO=$(grep -E "writeFileSync|process\.argv|Bun\.fetch|fetch\(" career-os/scripts/study-topic-recommender/render/markdown.ts | wc -l)
[ "$LEFT_IO" -eq 0 ] || { echo "PHASE_FAILED: render/ 순수성 위반"; exit 1; }
echo "[render/markdown.ts] OK"

# 1-5. cli.ts 존재 + main 진입점
test -f career-os/scripts/study-topic-recommender/cli.ts || { echo "PHASE_FAILED: cli.ts 부재"; exit 1; }
grep -q "import.meta.main\|main()" career-os/scripts/study-topic-recommender/cli.ts || { echo "PHASE_FAILED: cli.ts main 진입점 부재"; exit 1; }
echo "[cli.ts] OK"

# 1-6. refresh_topic_inventory.ts shim 화 (< 20 줄)
LINES=$(wc -l < career-os/scripts/study-topic-recommender/refresh_topic_inventory.ts)
[ "$LINES" -lt 20 ] || { echo "PHASE_FAILED: refresh_topic_inventory.ts shim 화 미완 ($LINES 줄)"; exit 1; }
grep -q "./cli" career-os/scripts/study-topic-recommender/refresh_topic_inventory.ts || { echo "PHASE_FAILED: shim 에 ./cli import 없음"; exit 1; }
echo "[refresh_topic_inventory.ts shim] OK ($LINES 줄)"

# 1-7. import chain 통과
bun --eval "
const mod = await import('./career-os/scripts/study-topic-recommender/refresh_topic_inventory.ts');
if (Object.keys(mod).length === 0) {
  console.error('PHASE_FAILED: shim re-export 없음');
  process.exit(1);
}
console.log('[import chain] OK', Object.keys(mod).length, '개 export');
" || { echo "PHASE_FAILED: import chain 끊김"; exit 1; }

# 1-8. SKILL.md path 인용 그대로 (refresh_topic_inventory.ts 유지)
grep -q "refresh_topic_inventory.ts" career-os/.claude/skills/study-topic-recommender/SKILL.md || { echo "PHASE_FAILED: SKILL.md refresh_topic_inventory.ts 인용 누락 (backward compat 깨짐)"; exit 1; }
echo "[SKILL.md backward compat] OK"
```

### 2. index.json status=completed

`Edit` 도구로 `career-os/tasks/plan027-refresh-topic-inventory-decompose/index.json` 갱신:
- `status`: `"completed"`
- `current_phase`: `3`
- `updated_at`: 현재 시각 (ISO 8601 UTC)

### 3. commit + push

```bash
git add career-os/tasks/plan027-refresh-topic-inventory-decompose/index.json
git commit -m "$(cat <<'COMMIT_EOF'
task(career-os): plan027 index.json status=completed (phase-03)

plan027 단계 1~3 통과:
- phase-01: transform/ 4 파일 추출 (scoring / recommend / filter / types) — 순수 함수 격리
- phase-02: render/markdown.ts 추출 + cli.ts 신설 + refresh_topic_inventory.ts shim 화
- phase-03: 통합 정적 검증 + status=completed

ADR-035 분해 컨벤션 첫 적용 완료. 후속 plan028~031: collect_live_postings / feed_discovery / collect_company_sites / run_with_discord_notify.

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

- 정적 검증 8 항목 — ADR / transform 4 파일 / 순수성 / render / cli / shim / import chain / SKILL.md backward compat.
- live e2e 는 본 phase 미수행 — 다음 morning recommend 실행 (`/study-topic-recommender`) 에서 자연 검증.
- import chain 검증 (bun --eval) 이 가장 강한 회귀 방어 — shim → cli.ts → transform/render 의 import 그래프가 깨지지 않음 보장.
- 후속 plan028~031 의 진입점: 본 plan027 의 transform / render / cli.ts 패턴 그대로 적용.
