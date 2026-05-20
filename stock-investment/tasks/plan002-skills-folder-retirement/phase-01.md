# Phase 1 — 3 skill 분리 마이그 + 4 runner SKILL_ROOT/path 갱신

stock-investment plan002 phase-01. ADR-006 분리 패턴 적용 — `skills/<name>/scripts/*` → `scripts/<name>/`, `skills/<name>/{SKILL.md, references/}` → `.claude/skills/<name>/`. 4 runner (run_report.sh + run_smoke_test.sh + run_issue_report.sh + run_daily_note.sh) SKILL_ROOT/PROMPT_FILE/COLLECTOR/NOTIFIER 갱신.

## 작업 위치 (cwd 정책)

run-phases.py가 본 phase를 `cwd=stock-investment/` (워크스페이스)로 실행. 첫 bash 블록:

```bash
cd "$(git rev-parse --show-toplevel)"
```

이후 path는 `stock-investment/...` 형식.

## 관련 docs (먼저 읽기)

- `stock-investment/docs/code-architecture.md` — plan002 시점 트리 (scripts/ + .claude/skills/) + skill 배치 패턴 (SKILL_DIR / WS_ROOT 정의).
- `apartment/scripts/apartment-daily-report/run_report.sh` — apartment plan007 마이그 후 path 패턴 참고.
- `ai-nodes/docs/adr.md` ADR-006 — 분리 표준 본문.
- `~/.openclaw/cron/jobs.json` (read only — openclaw_safety 정책) — cron payload absolute path 확인용.

## 변경할 파일

**이동 (git mv)**:

`skills/stock-investing-morning-brief/scripts/`의 4 파일 → `scripts/stock-investing-morning-brief/`:
- run_report.sh
- run_smoke_test.sh
- collect_sources.py
- notify_discord.sh

`skills/stock-investing-morning-brief/{SKILL.md, references/}` → `.claude/skills/stock-investing-morning-brief/`:
- SKILL.md
- references/claude-prompt.md

`skills/current-issue-analysis/scripts/`의 3 파일 → `scripts/current-issue-analysis/`:
- run_issue_report.sh
- collect_issue_sources.py
- notify_discord.sh

`skills/current-issue-analysis/{SKILL.md, references/}` → `.claude/skills/current-issue-analysis/`:
- SKILL.md
- references/issue-prompt.md

`skills/daily-stock-analysis-note/scripts/`의 3 파일 → `scripts/daily-stock-analysis-note/`:
- run_daily_note.sh
- collect_daily_note_inputs.py
- sanitize_fos_study_markdown.py

`skills/daily-stock-analysis-note/{SKILL.md, references/}` → `.claude/skills/daily-stock-analysis-note/`:
- SKILL.md
- references/blog-note-prompt.md

**수정 (Edit) — 4 runner SKILL_ROOT/path 갱신**:
- `scripts/stock-investing-morning-brief/run_report.sh`
- `scripts/stock-investing-morning-brief/run_smoke_test.sh`
- `scripts/current-issue-analysis/run_issue_report.sh`
- `scripts/daily-stock-analysis-note/run_daily_note.sh`

**삭제 (rm + git status로 clean 확인)**:
- `skills/<name>/scripts/__pycache__/` (있다면 — .gitignore 패턴이라 git untracked)
- `skills/<name>/scripts/` 빈 디렉터리
- `skills/<name>/` 빈 디렉터리
- `skills/` 빈 디렉터리

## 명세

### 1. 디렉터리 신설

```bash
cd "$(git rev-parse --show-toplevel)"

mkdir -p stock-investment/scripts/stock-investing-morning-brief
mkdir -p stock-investment/scripts/current-issue-analysis
mkdir -p stock-investment/scripts/daily-stock-analysis-note
mkdir -p stock-investment/.claude/skills/stock-investing-morning-brief
mkdir -p stock-investment/.claude/skills/current-issue-analysis
mkdir -p stock-investment/.claude/skills/daily-stock-analysis-note
```

### 2. git mv (3 skill 동일 패턴)

```bash
cd "$(git rev-parse --show-toplevel)"

# stock-investing-morning-brief
git mv stock-investment/skills/stock-investing-morning-brief/scripts/run_report.sh stock-investment/scripts/stock-investing-morning-brief/run_report.sh
git mv stock-investment/skills/stock-investing-morning-brief/scripts/run_smoke_test.sh stock-investment/scripts/stock-investing-morning-brief/run_smoke_test.sh
git mv stock-investment/skills/stock-investing-morning-brief/scripts/collect_sources.py stock-investment/scripts/stock-investing-morning-brief/collect_sources.py
git mv stock-investment/skills/stock-investing-morning-brief/scripts/notify_discord.sh stock-investment/scripts/stock-investing-morning-brief/notify_discord.sh
git mv stock-investment/skills/stock-investing-morning-brief/SKILL.md stock-investment/.claude/skills/stock-investing-morning-brief/SKILL.md
git mv stock-investment/skills/stock-investing-morning-brief/references stock-investment/.claude/skills/stock-investing-morning-brief/references

# current-issue-analysis
git mv stock-investment/skills/current-issue-analysis/scripts/run_issue_report.sh stock-investment/scripts/current-issue-analysis/run_issue_report.sh
git mv stock-investment/skills/current-issue-analysis/scripts/collect_issue_sources.py stock-investment/scripts/current-issue-analysis/collect_issue_sources.py
git mv stock-investment/skills/current-issue-analysis/scripts/notify_discord.sh stock-investment/scripts/current-issue-analysis/notify_discord.sh
git mv stock-investment/skills/current-issue-analysis/SKILL.md stock-investment/.claude/skills/current-issue-analysis/SKILL.md
git mv stock-investment/skills/current-issue-analysis/references stock-investment/.claude/skills/current-issue-analysis/references

# daily-stock-analysis-note
git mv stock-investment/skills/daily-stock-analysis-note/scripts/run_daily_note.sh stock-investment/scripts/daily-stock-analysis-note/run_daily_note.sh
git mv stock-investment/skills/daily-stock-analysis-note/scripts/collect_daily_note_inputs.py stock-investment/scripts/daily-stock-analysis-note/collect_daily_note_inputs.py
git mv stock-investment/skills/daily-stock-analysis-note/scripts/sanitize_fos_study_markdown.py stock-investment/scripts/daily-stock-analysis-note/sanitize_fos_study_markdown.py
git mv stock-investment/skills/daily-stock-analysis-note/SKILL.md stock-investment/.claude/skills/daily-stock-analysis-note/SKILL.md
git mv stock-investment/skills/daily-stock-analysis-note/references stock-investment/.claude/skills/daily-stock-analysis-note/references
```

### 3. runner 4개 SKILL_ROOT/path 갱신

각 runner 옛 패턴:

```bash
SKILL_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROMPT_FILE="$SKILL_ROOT/references/<file>.md"
COLLECTOR="$SKILL_ROOT/scripts/<collector>.py"
NOTIFIER="$SKILL_ROOT/scripts/notify_discord.sh"
```

새 패턴 (ADR-006 분리):

```bash
SKILL_DIR="$(cd "$(dirname "$0")" && pwd)"
WS_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PROMPT_FILE="$WS_ROOT/.claude/skills/<name>/references/<file>.md"
COLLECTOR="$SKILL_DIR/<collector>.py"
NOTIFIER="$SKILL_DIR/notify_discord.sh"
```

**각 runner 갱신 명세**:

**(a) scripts/stock-investing-morning-brief/run_report.sh** (L15 + L23-25):

```
- SKILL_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
+ SKILL_DIR="$(cd "$(dirname "$0")" && pwd)"
+ WS_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
- PROMPT_FILE="$SKILL_ROOT/references/claude-prompt.md"
+ PROMPT_FILE="$WS_ROOT/.claude/skills/stock-investing-morning-brief/references/claude-prompt.md"
- COLLECTOR="$SKILL_ROOT/scripts/collect_sources.py"
+ COLLECTOR="$SKILL_DIR/collect_sources.py"
- NOTIFIER="$SKILL_ROOT/scripts/notify_discord.sh"
+ NOTIFIER="$SKILL_DIR/notify_discord.sh"
```

**(b) scripts/stock-investing-morning-brief/run_smoke_test.sh**:

본문 Read 후 SKILL_ROOT 사용 위치 모두 갱신. 동일 패턴 적용.

**(c) scripts/current-issue-analysis/run_issue_report.sh** (L15 + L23-25):

```
- SKILL_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
+ SKILL_DIR="$(cd "$(dirname "$0")" && pwd)"
+ WS_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
- PROMPT_FILE="$SKILL_ROOT/references/issue-prompt.md"
+ PROMPT_FILE="$WS_ROOT/.claude/skills/current-issue-analysis/references/issue-prompt.md"
- COLLECTOR="$SKILL_ROOT/scripts/collect_issue_sources.py"
+ COLLECTOR="$SKILL_DIR/collect_issue_sources.py"
- NOTIFIER="$SKILL_ROOT/scripts/notify_discord.sh"
+ NOTIFIER="$SKILL_DIR/notify_discord.sh"
```

**(d) scripts/daily-stock-analysis-note/run_daily_note.sh** (L17 + L28-32):

특수 — NOTIFIER가 cross-skill (morning-brief 빌려씀):

```
- SKILL_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
+ SKILL_DIR="$(cd "$(dirname "$0")" && pwd)"
+ WS_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
- PROMPT_FILE="$SKILL_ROOT/references/blog-note-prompt.md"
+ PROMPT_FILE="$WS_ROOT/.claude/skills/daily-stock-analysis-note/references/blog-note-prompt.md"
- COLLECTOR="$SKILL_ROOT/scripts/collect_daily_note_inputs.py"
+ COLLECTOR="$SKILL_DIR/collect_daily_note_inputs.py"
- SANITIZER="$SKILL_ROOT/scripts/sanitize_fos_study_markdown.py"
+ SANITIZER="$SKILL_DIR/sanitize_fos_study_markdown.py"
- NOTIFIER="$TASK_ROOT/skills/stock-investing-morning-brief/scripts/notify_discord.sh"
+ NOTIFIER="$TASK_ROOT/scripts/stock-investing-morning-brief/notify_discord.sh"
```

### 4. 옛 skills/ 디렉터리 정리

```bash
cd "$(git rev-parse --show-toplevel)"

# __pycache__ 정리 (gitignore라 git status에 안 나타나지만 fs 정리)
rm -rf stock-investment/skills/*/scripts/__pycache__
rm -rf stock-investment/skills/*/__pycache__ 2>/dev/null || true

# 빈 디렉터리 rmdir (모든 자산 git mv 후 비어있어야 함)
rmdir stock-investment/skills/stock-investing-morning-brief/scripts
rmdir stock-investment/skills/stock-investing-morning-brief
rmdir stock-investment/skills/current-issue-analysis/scripts
rmdir stock-investment/skills/current-issue-analysis
rmdir stock-investment/skills/daily-stock-analysis-note/scripts
rmdir stock-investment/skills/daily-stock-analysis-note
rmdir stock-investment/skills

# (skills/<name>/.omc 같은 hidden dir 있으면 rmdir 실패 — 해당 디렉터리도 확인)
```

skills/stock-investing-morning-brief/.omc 디렉터리 발견 시 — read-only artifact일 가능성. 단순 `rm -rf`는 위험. `ls -la` 후 사용자 PHASE_BLOCKED 또는 안전한 `git ls-files | grep` 확인 후 결정.

## 성공 기준

```bash
cd "$(git rev-parse --show-toplevel)"

# 1. 옛 skills/ 부재
test ! -d stock-investment/skills || (echo "FAIL: 옛 skills/ 잔존" && ls -la stock-investment/skills && exit 1)
echo "[옛 skills/ 부재] OK"

# 2. 새 scripts/ + .claude/skills/ 트리
for s in stock-investing-morning-brief current-issue-analysis daily-stock-analysis-note; do
  test -d "stock-investment/scripts/$s" || (echo "FAIL: scripts/$s 부재" && exit 1)
  test -d "stock-investment/.claude/skills/$s" || (echo "FAIL: .claude/skills/$s 부재" && exit 1)
  test -f "stock-investment/.claude/skills/$s/SKILL.md" || (echo "FAIL: $s/SKILL.md 부재" && exit 1)
  test -d "stock-investment/.claude/skills/$s/references" || (echo "FAIL: $s/references/ 부재" && exit 1)
done
echo "[새 트리] OK"

# 3. 4 runner 존재 + 새 path
test -f stock-investment/scripts/stock-investing-morning-brief/run_report.sh
test -f stock-investment/scripts/stock-investing-morning-brief/run_smoke_test.sh
test -f stock-investment/scripts/current-issue-analysis/run_issue_report.sh
test -f stock-investment/scripts/daily-stock-analysis-note/run_daily_note.sh
echo "[4 runner 새 path] OK"

# 4. 옛 SKILL_ROOT 패턴 잔존 0
LEFT=$(grep -rn 'SKILL_ROOT="$(cd "$(dirname "$0")/\.\." && pwd)"' stock-investment/scripts/ 2>&1 | wc -l)
test "$LEFT" -eq 0 || (echo "FAIL: 옛 SKILL_ROOT 패턴 $LEFT 건 잔존" && exit 1)
echo "[옛 SKILL_ROOT 0] OK"

# 5. 새 WS_ROOT 패턴 4 runner 모두 등장
WSROOT=$(grep -rn 'WS_ROOT="$(cd "$(dirname "$0")/\.\./\.\." && pwd)"' stock-investment/scripts/ | wc -l)
test "$WSROOT" -eq 4 || (echo "FAIL: WS_ROOT 패턴 $WSROOT 건 (4 기대)" && exit 1)
echo "[새 WS_ROOT 4건] OK"

# 6. shell syntax 4 runner
bash -n stock-investment/scripts/stock-investing-morning-brief/run_report.sh
bash -n stock-investment/scripts/stock-investing-morning-brief/run_smoke_test.sh
bash -n stock-investment/scripts/current-issue-analysis/run_issue_report.sh
bash -n stock-investment/scripts/daily-stock-analysis-note/run_daily_note.sh
echo "[shell syntax] OK"

# 7. daily-note NOTIFIER cross-skill path 갱신
grep -q '\$TASK_ROOT/scripts/stock-investing-morning-brief/notify_discord.sh' stock-investment/scripts/daily-stock-analysis-note/run_daily_note.sh
! grep -q '\$TASK_ROOT/skills/' stock-investment/scripts/daily-stock-analysis-note/run_daily_note.sh
echo "[daily-note NOTIFIER cross-skill] OK"

# 8. smoke test 실 실행 (network 의존 — 차단 시 PHASE_BLOCKED 가능)
bash stock-investment/scripts/stock-investing-morning-brief/run_smoke_test.sh
echo "[smoke_test 실행] OK"
```

성공 기준: 1-7 모두 통과 + 8은 network 의존.

## 금지 사항

- 신규 *기능* 파일 생성 (단순 path 이동 + SKILL_ROOT 갱신만).
- runner 안 *호출 로직* 변경 — SKILL_ROOT/PROMPT_FILE/COLLECTOR/NOTIFIER path만 변경.
- config / data / docs 변경 (phase-01 산출 보존).
- ADR 본문 수정.
- ai-nodes/docs/workspace-structure.md 매트릭스 갱신 — plan004에서 처리.
- `~/.openclaw/cron/jobs.json` 수정 — openclaw_safety 정책. phase-02에서 안내만.
- amend / force push.
- section mark (U+00A7) 직접 입력.

## commit

```bash
cd "$(git rev-parse --show-toplevel)"

git add stock-investment/scripts/ stock-investment/.claude/

git status --porcelain | grep -E "^(A|M|D|R) " | head -30
# 의도 외 staged 파일 0 — cross-session race 회피.

git commit -m "refactor(stock-investment): ADR-006 분리 패턴 마이그 (plan002 phase-01)

- 3 skill (morning-brief / issue-analysis / daily-note) skills/<name>/ → scripts/<name>/ + .claude/skills/<name>/
- 4 runner SKILL_ROOT 패턴 → SKILL_DIR + WS_ROOT 분리
- PROMPT_FILE → \$WS_ROOT/.claude/skills/<name>/references/<file>
- COLLECTOR / NOTIFIER → \$SKILL_DIR/<file>
- daily-note NOTIFIER cross-skill: \$TASK_ROOT/scripts/stock-investing-morning-brief/notify_discord.sh
- 옛 skills/ 디렉터리 git rm

cron payload absolute path 수동 갱신 필요 — phase-02 안내. openclaw_safety 정책상 jobs.json 직접 편집 금지.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

push 없음 (phase-02 책임).

## PHASE_BLOCKED / PHASE_FAILED 조건

- skills/<name>/.omc 또는 다른 hidden artifact 발견 시 — `PHASE_BLOCKED: skills/ 안 미예상 자산 — 사용자 검토 필요`.
- 옛 SKILL_ROOT 패턴 잔존 (성공 기준 4) — `PHASE_FAILED: runner 갱신 누락`.
- WS_ROOT 카운트 mismatch (성공 기준 5) — `PHASE_FAILED: 4 runner 모두 갱신 안 됨`.
- shell syntax 오류 (성공 기준 6) — `PHASE_FAILED: shell syntax 회귀`.
- daily-note NOTIFIER cross-skill 미갱신 (성공 기준 7) — `PHASE_FAILED: cross-skill path 누락`.
- smoke_test network 차단 — `PHASE_BLOCKED: smoke_test 네트워크 차단`.
- smoke_test 기능 회귀 — `PHASE_FAILED: smoke_test 결과 mismatch — diff 첨부`.
- 의도 외 staged 파일 — `PHASE_BLOCKED: cross-session stage race`.
