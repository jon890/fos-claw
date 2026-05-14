# Phase 4 — docs 갱신 + 정적 검증 + push + trailing cleanup

**Model**: sonnet
**Status**: pending

---

## 목표

5문서 + AGENTS.md + command-router SKILL.md 갱신. 정적 검증 (잔재 0 + tsc + bash -n + native skill 명세 grep). 모든 commit push + plan016 마무리.

**범위 외**: SKILL.md 본문 변경 (phase-03 완료), ts 알고리즘 변경.

## 관련 docs (실행 전 필수 읽기)

- phase-03 commit — SKILL.md + dispatcher 폐기 완료
- `career-os/AGENTS.md` line 48 — 명령 목록 갱신 대상
- `career-os/docs/{prd,flow,code-architecture,data-schema}.md` — 5문서 갱신 대상

## 사전 검증

```bash
cd /home/bifos/ai-nodes

# 1-A. phase-03 commit 존재
git log -1 --format='%s' | grep -q "plan016 phase-03" \
  || { echo "PHASE_BLOCKED: phase-03 commit 없음"; exit 2; }

# 1-B. 핵심 산출물 존재 (phase-01~03 결과)
test -f career-os/scripts/study-topic-recommender/refresh_topic_inventory.ts \
  || { echo "PHASE_BLOCKED: ts script 부재"; exit 2; }
test -f career-os/.claude/skills/study-topic-recommender/SKILL.md \
  || { echo "PHASE_BLOCKED: SKILL.md 부재"; exit 2; }
SKILL_LINES=$(wc -l < career-os/.claude/skills/study-topic-recommender/SKILL.md)
[ "$SKILL_LINES" -ge 120 ] \
  || { echo "PHASE_BLOCKED: SKILL.md $SKILL_LINES 줄 — phase-03 미완"; exit 2; }
echo "사전 검증 OK"
```

## 작업 항목

### 1. 5문서 갱신

#### 1-A. AGENTS.md (line 48) — dispatcher 7 → 5개

옛 명령 목록에서 `recommend-topics` + `live-coding-dispatch` 제거. native 진입점 1개 추가.

새 명령 목록 (5개): `baseline` · `daily [topic]` · `recommend-positions` · `foodville-coffeechat` · `smoke`.

native skill 진입점 추가 (지금까지 누적): study-pack / interview-asset + study-topic-recommender 3개.

#### 1-B. prd.md 기능 표

`recommend-topics` + `live-coding-dispatch` 행 제거. 산출물 정책 부분에 native skill 진입점 안내.

#### 1-C. flow.md

- ASCII flow 그림 (line 1-30 부근) 갱신: dispatcher 케이스 표시 정리
- `recommend-topics` 섹션 + `live-coding-dispatch` 섹션 통째 제거 또는 *native skill 안내*로 짧게 갱신 (study-pack/interview-asset 패턴 따라)

#### 1-D. code-architecture.md

- `scripts/study-topic-recommender/` 트리: Python 파일 제거 + ts 파일 추가 (refresh_topic_inventory.ts + feed_discovery.ts). run_*.sh 제거.
- `.claude/skills/study-topic-recommender/` 트리: SKILL.md만 유지 (references/ 부재).

#### 1-E. data-schema.md

`config/live-coding-seed-pool.json` + `seed-candidates.json` 스키마 항목이 있다면 *유지 + study-topic-recommender가 Read* 명시.

`data/runtime/topic-inventory.json` + `morning-topic-recommendation.md` + `topic-inventory-history.jsonl` 스키마 항목 *유지* (ts 마이그 시 호환 결정 — ADR-026).

#### 1-F. command-router SKILL.md (line 16)

명령 목록 7 → 5개 갱신.

### 2. 정적 검증

```bash
cd /home/bifos/ai-nodes

# 2-A. 옛 Python 잔재 0건
HITS=$(grep -rln "refresh_topic_inventory\.py\|feed_discovery\.py" career-os/ _shared/ 2>/dev/null | grep -v "career-os/tasks/" | wc -l)
[ "$HITS" = "0" ] || { echo "PHASE_FAILED: Python 잔재 $HITS"; grep -rln "refresh_topic_inventory\.py\|feed_discovery\.py" career-os/ _shared/ 2>/dev/null | grep -v "career-os/tasks/"; exit 1; }
echo "[2-A] Python 잔재 0 OK"

# 2-B. 옛 shell runner 잔재 0건 (run_topic_recommendation.sh / run_live_coding_dispatch.sh)
HITS=$(grep -rln "run_topic_recommendation\.sh\|run_live_coding_dispatch\.sh" career-os/scripts/ career-os/.claude/skills/ _shared/ 2>/dev/null | wc -l)
[ "$HITS" = "0" ] || { echo "PHASE_FAILED: 옛 shell runner 잔재 $HITS"; exit 1; }
echo "[2-B] 옛 shell runner 잔재 0 OK"

# 2-C. dispatcher recommend-topics + live-coding-dispatch case 0건
for c in "recommend-topics" "live-coding-dispatch"; do
  HITS=$(grep -cE "^\s*$c\)" career-os/scripts/command-router/run_now.sh)
  [ "$HITS" = "0" ] || { echo "PHASE_FAILED: dispatcher $c case 잔존"; exit 1; }
done
echo "[2-C] dispatcher case 0 OK"

# 2-D. dispatcher bash syntax + case 수 5
bash -n career-os/scripts/command-router/run_now.sh \
  || { echo "PHASE_FAILED: dispatcher bash syntax"; exit 1; }
CASES=$(grep -cE "^\s*[a-z-]+\)" career-os/scripts/command-router/run_now.sh)
[ "$CASES" = "5" ] || { echo "PHASE_FAILED: dispatcher case 수 $CASES (expected 5)"; exit 1; }
echo "[2-D] bash syntax + case 5 OK"

# 2-E. tsc 통과
bunx tsc --noEmit 2>&1 | tee /tmp/plan016-phase04-tsc.log
[ "${PIPESTATUS[0]}" -eq 0 ] || { echo "PHASE_FAILED: tsc"; cat /tmp/plan016-phase04-tsc.log; exit 1; }
echo "[2-E] tsc OK"

# 2-F. SKILL.md 필수 섹션 + native invoke 안내
SKILL=career-os/.claude/skills/study-topic-recommender/SKILL.md
for s in "When to use" "Inputs" "Workflow" "Self-check" "Error handling" "replenish" "promote" "live-coding"; do
  grep -q "$s" "$SKILL" || { echo "PHASE_FAILED: SKILL.md 키워드 '$s' 누락"; exit 1; }
done
grep -q "claude -p\|/study-topic-recommender" "$SKILL" \
  || { echo "PHASE_FAILED: native invoke 안내 누락"; exit 1; }
echo "[2-F] SKILL.md 검증 OK"

# 2-G. docs에 옛 명령 잔재 0건 (history mention 제외 — "plan015에서 폐기" 같은 표기는 OK)
for d in prd flow code-architecture data-schema; do
  # 실제 dispatch 명령 안내 잔재 검사 — history mention 제외 위해 패턴 제한
  HITS=$(grep -cE "^\| \`recommend-topics\`|^\| \`live-coding-dispatch\`" career-os/docs/$d.md 2>/dev/null)
  [ "$HITS" = "0" ] || { echo "PHASE_FAILED: docs/$d.md 옛 명령 행 잔존"; exit 1; }
done
echo "[2-G] docs 옛 명령 행 잔재 0 OK"
```

### 3. index.json status=completed 마킹

```bash
cd /home/bifos/ai-nodes
python3 - <<'PY'
import json
from pathlib import Path
p = Path("career-os/tasks/plan016-study-topic-recommender-native/index.json")
data = json.loads(p.read_text(encoding="utf-8"))
data["status"] = "completed"
data["current_phase"] = 4
for phase in data["phases"]:
    phase["status"] = "completed"
p.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("[index.json] marked completed")
PY
```

### 4. 최종 commit + push

```bash
cd /home/bifos/ai-nodes
HEAD_BEFORE=$(git rev-parse HEAD)

git add career-os/AGENTS.md \
        career-os/docs/ \
        career-os/.claude/skills/command-router/SKILL.md \
        career-os/tasks/plan016-study-topic-recommender-native/index.json

git commit -m "$(cat <<'COMMIT_EOF'
docs(career-os): study-topic-recommender native 마이그 5문서 갱신 + plan016 완료 마킹

ADR-026 적용 마무리. plan016 phase-01~03에서 ts 마이그 + SKILL.md 재작성 +
dispatcher 폐기 완료. 본 commit은 docs 후속 정리 + index.json status 마킹.

- AGENTS.md: dispatcher 명령 7 → 5개 (recommend-topics + live-coding-dispatch
  제거). native 진입점 누적 3개 (study-pack / interview-asset /
  study-topic-recommender).
- prd.md: 기능 표에서 두 명령 행 제거.
- flow.md: recommend-topics + live-coding-dispatch 섹션을 native skill
  안내로 간소화. ASCII flow 정리.
- code-architecture.md: scripts/study-topic-recommender/ 트리에 Python →
  ts. .claude/skills/ 트리에서 references/ 제거 (현재 없음).
- data-schema.md: live-coding-seed-pool.json + seed-candidates.json은
  유지 (SKILL.md가 Read). topic-inventory.json + history.jsonl format
  유지 (ts 마이그 시 호환).
- command-router SKILL.md: 명령 목록 5개로.

dispatcher case 7 → 5개. 누적 native skill 진입점 3개.
COMMIT_EOF
)" || { echo "PHASE_FAILED: commit"; exit 1; }

HEAD_AFTER=$(git rev-parse HEAD)
COMMITS=$(git rev-list "$HEAD_BEFORE..$HEAD_AFTER" --count)
[ "$COMMITS" = "1" ] \
  || { echo "PHASE_FAILED: 본 phase commit 수 $COMMITS (expected 1)"; exit 1; }

git push origin main || { echo "PHASE_FAILED: push 실패"; exit 1; }
echo "[4] commit + push OK"
```

### 5. trailing cleanup

```bash
cd /home/bifos/ai-nodes
if [ -n "$(git status --porcelain career-os/tasks/plan016-study-topic-recommender-native/index.json)" ]; then
  python3 -c "
from pathlib import Path
p = Path('career-os/tasks/plan016-study-topic-recommender-native/index.json')
text = p.read_text(encoding='utf-8')
if not text.endswith('\n'):
    p.write_text(text + '\n', encoding='utf-8')
"
  git add career-os/tasks/plan016-study-topic-recommender-native/index.json
  git commit -m "task(career-os): plan016 index.json commitSha 후기록 + EOL 보정"
  git push origin main
fi

DIRTY=$(git status --porcelain career-os/tasks/plan016-study-topic-recommender-native/ | wc -l)
[ "$DIRTY" = "0" ] || { echo "PHASE_FAILED: trailing 후 dirty"; exit 1; }
echo "trailing cleanup OK"
```

## Critical Files

| 파일 | 변경 |
|---|---|
| `career-os/AGENTS.md` | dispatcher 명령 목록 갱신 |
| `career-os/docs/{prd,flow,code-architecture,data-schema}.md` | 옛 명령 / Python 흔적 정리 + native skill 안내 |
| `career-os/.claude/skills/command-router/SKILL.md` | 명령 목록 5개 |
| `career-os/tasks/plan016-study-topic-recommender-native/index.json` | status=completed |

## 사용자 직접 처리 안내 (phase 외)

phase 종료 후 사용자가 환경에서 수행:

```bash
# 실제 native skill 동작 smoke
claude -p "/study-topic-recommender"

# 정상 동작 확인:
#   - SKILL.md 자동 로드 ✓
#   - candidate → primary auto-detect (있다면)
#   - replenish (RSS feed-cache 활용)
#   - recommend (10픽 + 오늘의 3선)
#   - morning-topic-recommendation.md 갱신 ✓
```

## Blocked 조건

- phase-03 commit 없음 → `PHASE_BLOCKED` + `exit 2`
- 핵심 산출물 부재 → `PHASE_BLOCKED: phase-03 미완` + `exit 2`
- 정적 검증 2-A~G 실패 → `PHASE_FAILED: <항목>` + `exit 1`
- commit 수 ≠ 1 → `PHASE_FAILED: commit 위장 의심` + `exit 1`
- push 실패 → `PHASE_FAILED: push` + `exit 1`
- trailing 후 dirty → `PHASE_FAILED: trailing 미완` + `exit 1`

## 의도 메모

- *5문서 갱신 + index.json 마킹*은 한 commit으로 묶음 — atomicity.
- trailing cleanup은 run-phases.py의 commitSha 후기록 처리 (common-pitfalls 6-2).
- 실제 native skill 동작 smoke는 사용자 환경에서 (fos-study commit/push 부수효과 때문에 phase에서 회피).
