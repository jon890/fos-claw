# Phase 05 — caller 갱신 + 옛 헬퍼 폐기 + 통합 smoke + push

**Model**: sonnet
**Status**: pending

---

## 목표

phase-03/04 가 만든 3 TS 헬퍼를 caller 가 사용하도록 갱신하고, 옛 동등물 (`claude_lib.sh`, `format_cost_summary.py`, `extract_claude_result.py`, 워크스페이스별 `notify_discord.sh`) 을 일괄 삭제. 통합 smoke + index.json status=completed + push.

범위 외: extractor / renderer / runner / dispatcher 의 TS 화 (별도 plan), update_artifacts.py (당분간 Python 유지 — ADR-018 결정).

## 관련 docs

- `career-os/docs/adr.md` ADR-018 (정책), ADR-014 (회계 패턴).
- `_shared/lib/{notify_discord, format_cost_summary, invoke_claude_skills}.ts` (phase-03/04 산출물).

## 갱신할 caller (실측 기반)

### `claude_lib.sh::claude_persist_usage` 호출하는 6 runner

```
career-os/skills/study-pack-writer/scripts/run_study_pack.sh
career-os/skills/study-pack-maintainer/scripts/run_maintainer.sh
career-os/skills/experience-question-bank-writer/scripts/run_question_bank.sh
career-os/skills/interview-master-writer/scripts/run_master.sh
career-os/skills/position-recommender/scripts/run_position_recommendation.sh
career-os/skills/cj-foodville-coffeechat-prep/scripts/run_foodville_coffeechat_prep.sh
```

각 runner 변경 패턴:

```bash
# Before
source "$HOME/ai-nodes/_shared/bin/claude_lib.sh"
# ...
claude_persist_usage "$RAW_RESULT_JSON"

# After
# (source 라인 제거)
# ...
bun run "$HOME/ai-nodes/_shared/lib/invoke_claude_skills.ts" persist-usage "$RAW_RESULT_JSON"
```

### `extract_claude_result.py` 호출하는 3 runner

```
career-os/skills/cj-oliveyoung-java-backend-prep/scripts/run_baseline.sh
career-os/skills/cj-oliveyoung-java-backend-prep/scripts/run_daily.sh
career-os/skills/cj-oliveyoung-java-backend-prep/scripts/run_smoke_test.sh
career-os/skills/cj-foodville-coffeechat-prep/scripts/run_foodville_coffeechat_prep.sh (해당 시)
```

각 runner 변경 패턴:

```bash
# Before
python3 "$HOME/ai-nodes/_shared/bin/extract_claude_result.py" "$RAW_JSON" "$REPORT_MD" "${TRACK_TASK_CLAUDE_USAGE_FILE:-}"

# After
bun run "$HOME/ai-nodes/_shared/lib/invoke_claude_skills.ts" extract \
  "$RAW_JSON" "$REPORT_MD" "${TRACK_TASK_CLAUDE_USAGE_FILE:-}"
```

### `format_cost_summary.py` 호출하는 곳

```
career-os/skills/cj-oliveyoung-java-backend-prep/scripts/run_now.sh
```

`run_tracked()` 헬퍼 안:

```bash
# Before
local cost_line=""
cost_line="$(python3 "$FORMAT_COST" "$TASK_ROOT" "$task_name" 2>/dev/null || true)"

# After (FORMAT_COST 변수도 _shared/lib/format_cost_summary.ts 로)
local cost_line=""
cost_line="$(bun run "$FORMAT_COST" "$TASK_ROOT" "$task_name" 2>/dev/null || true)"

# 그리고 run_now.sh 헤더 영역:
# Before:
# FORMAT_COST="$HOME/ai-nodes/_shared/bin/format_cost_summary.py"
# After:
FORMAT_COST="$HOME/ai-nodes/_shared/lib/format_cost_summary.ts"
```

### 워크스페이스별 `notify_discord.sh` 호출하는 곳

`run_now.sh` 의 `run_tracked()` 헬퍼 + `notify_discord.sh` 변수 정의 영역.

```bash
# Before
NOTIFY_SCRIPT="$TASK_ROOT/skills/cj-oliveyoung-java-backend-prep/scripts/notify_discord.sh"
# ...
"$NOTIFY_SCRIPT" "[완료] ${label}${cost_line}" || true

# After
NOTIFY_SCRIPT="bun run $HOME/ai-nodes/_shared/lib/notify_discord.ts"
# ...
$NOTIFY_SCRIPT "[완료] ${label}${cost_line}" || true
# (또는 명확하게)
bun run "$HOME/ai-nodes/_shared/lib/notify_discord.ts" "[완료] ${label}${cost_line}" || true
```

`replenish_topic_reservoir.py` 내부에서 Python 으로 직접 Claude 호출하는 케이스는 ADR-014 의 인라인 패턴 그대로 유지 — TS 화 대상 외 (별도 plan).

## 작업 항목

### 1. caller 일괄 grep + 갱신

```bash
cd /home/bifos/ai-nodes

# 1-1. claude_lib.sh source 라인 grep
echo "=== claude_lib.sh source 위치 ==="
grep -rln "_shared/bin/claude_lib.sh" career-os/ 2>/dev/null | grep -v sources/fos-study

# 1-2. claude_persist_usage 호출 위치
echo "=== claude_persist_usage 호출 위치 ==="
grep -rln "claude_persist_usage" career-os/ 2>/dev/null | grep -v sources/fos-study

# 1-3. extract_claude_result.py 호출 위치
echo "=== extract_claude_result.py 호출 위치 ==="
grep -rln "extract_claude_result\.py" career-os/ 2>/dev/null | grep -v sources/fos-study

# 1-4. format_cost_summary.py 호출 위치
echo "=== format_cost_summary.py 호출 위치 ==="
grep -rln "format_cost_summary\.py" career-os/ 2>/dev/null | grep -v sources/fos-study

# 1-5. notify_discord.sh 호출 위치
echo "=== notify_discord.sh 호출 위치 ==="
grep -rln "notify_discord\.sh" career-os/ 2>/dev/null | grep -v sources/fos-study
```

각 grep 결과의 모든 파일에서 위 "갱신할 caller" 섹션의 Before/After 패턴 적용.

### 2. 옛 헬퍼 일괄 삭제

caller 갱신 완료 + `bash -n` / `python3 -m py_compile` 모든 변경 파일 통과 확인 후:

```bash
cd /home/bifos/ai-nodes

# _shared/bin/ 안 폐기 대상
git rm _shared/bin/claude_lib.sh
git rm _shared/bin/format_cost_summary.py
git rm _shared/bin/extract_claude_result.py

# 워크스페이스별 notify_discord.sh
git rm career-os/skills/cj-oliveyoung-java-backend-prep/scripts/notify_discord.sh
# notify_discord_media.sh 같은 변종이 있으면 일단 보존 (별도 plan)
```

`_shared/bin/track_task.sh` + `_shared/bin/update_artifacts.py` 는 보존.

### 3. 통합 smoke

#### 3-1. 모든 shell / python 문법

```bash
cd /home/bifos/ai-nodes

# 갱신된 8 runner + run_now.sh syntax
for f in career-os/skills/cj-oliveyoung-java-backend-prep/scripts/run_now.sh \
         career-os/skills/cj-oliveyoung-java-backend-prep/scripts/run_baseline.sh \
         career-os/skills/cj-oliveyoung-java-backend-prep/scripts/run_daily.sh \
         career-os/skills/cj-oliveyoung-java-backend-prep/scripts/run_smoke_test.sh \
         career-os/skills/study-pack-writer/scripts/run_study_pack.sh \
         career-os/skills/study-pack-maintainer/scripts/run_maintainer.sh \
         career-os/skills/experience-question-bank-writer/scripts/run_question_bank.sh \
         career-os/skills/interview-master-writer/scripts/run_master.sh \
         career-os/skills/position-recommender/scripts/run_position_recommendation.sh \
         career-os/skills/cj-foodville-coffeechat-prep/scripts/run_foodville_coffeechat_prep.sh; do
  bash -n "$f" || { echo "PHASE_FAILED: bash syntax $f"; exit 1; }
done
```

#### 3-2. TS 타입 검증

```bash
bunx tsc --noEmit
[ $? -eq 0 ] || { echo "PHASE_FAILED: tsc"; exit 1; }
```

#### 3-3. 옛 헬퍼 이름 잔존 0건 (코드 + 문서)

```bash
cd /home/bifos/ai-nodes

# code 안 잔존
for old in "claude_lib\.sh" "claude_persist_usage" "format_cost_summary\.py" "extract_claude_result\.py"; do
  count=$(grep -rln "$old" career-os/skills/ 2>/dev/null | grep -v sources/fos-study | wc -l)
  [ "$count" -eq 0 ] || { echo "PHASE_FAILED: $old 잔존 $count건"; grep -rln "$old" career-os/skills/ | grep -v sources/fos-study; exit 1; }
done

# workspace-level notify_discord.sh 잔존 (career-os 안에)
count=$(grep -rln "notify_discord\.sh" career-os/ 2>/dev/null | grep -v sources/fos-study | wc -l)
[ "$count" -eq 0 ] || { echo "PHASE_FAILED: notify_discord.sh 참조 $count건"; exit 1; }

# 옛 파일 자체 없음 확인
[ ! -f _shared/bin/claude_lib.sh ] || { echo "PHASE_FAILED: claude_lib.sh 잔존"; exit 1; }
[ ! -f _shared/bin/format_cost_summary.py ] || { echo "PHASE_FAILED: format_cost_summary.py 잔존"; exit 1; }
[ ! -f _shared/bin/extract_claude_result.py ] || { echo "PHASE_FAILED: extract_claude_result.py 잔존"; exit 1; }
```

#### 3-4. 새 헬퍼 호출 위치 모두 등장

```bash
cd /home/bifos/ai-nodes

# invoke_claude_skills.ts 호출 — persist-usage 또는 extract 양 모드 합쳐 8+ 호출 기대
count=$(grep -rln "invoke_claude_skills\.ts" career-os/ 2>/dev/null | grep -v sources/fos-study | wc -l)
[ "$count" -ge 6 ] || { echo "PHASE_FAILED: invoke_claude_skills.ts 호출 $count, expected 6+"; exit 1; }

# format_cost_summary.ts 호출 — run_now.sh 1곳
count=$(grep -rln "format_cost_summary\.ts" career-os/ 2>/dev/null | grep -v sources/fos-study | wc -l)
[ "$count" -ge 1 ] || { echo "PHASE_FAILED: format_cost_summary.ts 호출 $count, expected 1+"; exit 1; }

# notify_discord.ts 호출 — run_now.sh 1곳 이상
count=$(grep -rln "notify_discord\.ts" career-os/ 2>/dev/null | grep -v sources/fos-study | wc -l)
[ "$count" -ge 1 ] || { echo "PHASE_FAILED: notify_discord.ts 호출 $count, expected 1+"; exit 1; }
```

#### 3-5. dispatcher smoke — `run_now.sh` invalid mode 호출하면 usage 메시지

```bash
cd /home/bifos/ai-nodes
bash career-os/skills/cj-oliveyoung-java-backend-prep/scripts/run_now.sh invalid-mode 2>&1 | grep -q "usage:" || { echo "PHASE_FAILED: run_now.sh usage 메시지"; exit 1; }
```

### 4. index.json status=completed 마킹

```bash
cd /home/bifos/ai-nodes
python3 - <<'PY'
import json
from pathlib import Path
p = Path("career-os/tasks/plan004-shared-helpers-ts/index.json")
data = json.loads(p.read_text(encoding="utf-8"))
data["status"] = "completed"
data["current_phase"] = 5
for phase in data["phases"]:
    phase["status"] = "completed"
p.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("[index.json] marked completed")
PY
```

### 5. 최종 커밋 + push

phase-01 ~ phase-04 가 각자 커밋했으므로 본 phase 는 caller 갱신 + 옛 파일 삭제 + index.json 한 번에 커밋:

```bash
cd /home/bifos/ai-nodes
git add -A career-os/skills/ _shared/ career-os/tasks/plan004-shared-helpers-ts/index.json
git commit -m "$(cat <<'EOF'
refactor(career-os, _shared): caller 8+ 일괄 TS 헬퍼로 전환 + 옛 sh/py 폐기 (plan004 phase-05)

ADR-018 마지막 단계.

caller 갱신:
- 6 runner (study-pack-writer / study-pack-maintainer / question-bank / master / position / foodville) source claude_lib.sh 제거 + claude_persist_usage 호출 → bun run invoke_claude_skills.ts persist-usage
- 3 runner (baseline / daily / smoke) python3 extract_claude_result.py 호출 → bun run invoke_claude_skills.ts extract
- run_now.sh: NOTIFY_SCRIPT + FORMAT_COST 변수를 bun run + .ts 경로로

폐기:
- _shared/bin/claude_lib.sh
- _shared/bin/format_cost_summary.py
- _shared/bin/extract_claude_result.py
- 워크스페이스별 notify_discord.sh (career-os 안)

검증: bash -n / tsc / 옛 이름 참조 0건 / dispatcher usage 메시지 통과.

plan004 완료. plan004 task index.json status=completed.
EOF
)" && git push origin main
```

push 실패 시 `PHASE_FAILED: push (<stderr>)`.

## Critical Files

| 변경 종류 | 파일 |
|---|---|
| 수정 | run_now.sh, 9 runner shell |
| 삭제 (git rm) | _shared/bin/claude_lib.sh, _shared/bin/format_cost_summary.py, _shared/bin/extract_claude_result.py, career-os/skills/cj-oliveyoung-java-backend-prep/scripts/notify_discord.sh |
| 수정 | career-os/tasks/plan004-shared-helpers-ts/index.json |

## 의도 메모

- caller 갱신 + 옛 파일 폐기를 같은 phase 에 묶음 → 일관 상태. 중간 단계 (옛 + 새 공존) 가 main 에 안 남는다.
- update_artifacts.py 보존은 의도 — 별도 plan 으로 TS 화 검토.
- replenish_topic_reservoir.py 안의 인라인 Python claude subprocess 패턴은 본 plan 외 (그 자체를 TS 로 옮기려면 replenish 로직 전체를 다뤄야).

## Blocked 조건

- caller 갱신 후 syntax 실패 → `PHASE_FAILED: syntax (<file>)`.
- 옛 이름 잔존 → `PHASE_FAILED: 잔존 참조 (이름)`.
- tsc 실패 → `PHASE_FAILED: tsc`.
- push 권한 없음 → `PHASE_BLOCKED: push 권한`.
