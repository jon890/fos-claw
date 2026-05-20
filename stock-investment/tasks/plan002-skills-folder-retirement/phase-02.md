# Phase 2 — 통합 검증 + cron 수동 갱신 안내 + status=completed + push

stock-investment plan002 phase-02 (마지막). phase-01 산출 검증, cron 수동 갱신 안내, index.json status=completed, origin/main push.

## 작업 위치 (cwd 정책)

run-phases.py가 본 phase를 `cwd=stock-investment/` (워크스페이스)로 실행. 첫 bash 블록:

```bash
cd "$(git rev-parse --show-toplevel)"
```

## 관련 docs

- `stock-investment/tasks/plan002-skills-folder-retirement/index.json` — 본 task index.
- phase-01 산출 — 검증 대상.

## 검증 절차

```bash
cd "$(git rev-parse --show-toplevel)"

# 1. phase-01 commit 존재
git log --oneline -5
PHASE_01_SHA="$(git log --format='%H' --grep='plan002 phase-01' -n 1 | cut -c1-12)"
test -n "$PHASE_01_SHA" || (echo "PHASE_FAILED: phase-01 commit 부재" && exit 1)
echo "[phase-01 commit] $PHASE_01_SHA"

# 2. 옛 skills/ 부재
test ! -d stock-investment/skills || (echo "PHASE_FAILED: 옛 skills/ 잔존" && exit 1)
echo "[옛 skills/ 부재] OK"

# 3. 새 트리 (scripts/ + .claude/skills/) 정합
for s in stock-investing-morning-brief current-issue-analysis daily-stock-analysis-note; do
  test -d "stock-investment/scripts/$s" || (echo "PHASE_FAILED: scripts/$s 부재" && exit 1)
  test -d "stock-investment/.claude/skills/$s" || (echo "PHASE_FAILED: .claude/skills/$s 부재" && exit 1)
  test -f "stock-investment/.claude/skills/$s/SKILL.md" || (echo "PHASE_FAILED: $s/SKILL.md 부재" && exit 1)
done
echo "[새 트리 정합] OK"

# 4. 4 runner shell syntax
for r in \
  stock-investment/scripts/stock-investing-morning-brief/run_report.sh \
  stock-investment/scripts/stock-investing-morning-brief/run_smoke_test.sh \
  stock-investment/scripts/current-issue-analysis/run_issue_report.sh \
  stock-investment/scripts/daily-stock-analysis-note/run_daily_note.sh; do
  bash -n "$r" || (echo "PHASE_FAILED: $r syntax 오류" && exit 1)
done
echo "[4 runner syntax] OK"

# 5. 옛 SKILL_ROOT 패턴 잔존 0 (성공 기준 1 — phase-01 회귀 방어)
LEFT=$(grep -rn 'SKILL_ROOT="$(cd "$(dirname "$0")/\.\." && pwd)"' stock-investment/scripts/ 2>&1 | wc -l)
test "$LEFT" -eq 0 || (echo "PHASE_FAILED: 옛 SKILL_ROOT 잔존 $LEFT" && exit 1)
echo "[옛 SKILL_ROOT 0] OK"

# 6. docs 정합 (code-architecture.md + AGENTS.md 분리 패턴 표기)
grep -q "ADR-006 분리, plan002" stock-investment/docs/code-architecture.md
grep -q "ADR-006 분리 패턴" stock-investment/AGENTS.md
echo "[docs 정합] OK"

# 7. smoke test
bash stock-investment/scripts/stock-investing-morning-brief/run_smoke_test.sh
echo "[smoke_test] OK"
```

성공 기준: 1-6 모두 통과 + 7은 network 의존.

## index.json 갱신

```bash
cd "$(git rev-parse --show-toplevel)"

PHASE_01_SHA="$(git log --format='%H' --grep='plan002 phase-01' -n 1 | cut -c1-12)"
test -n "$PHASE_01_SHA" || (echo "PHASE_FAILED: phase commitSha 추출 실패" && exit 1)
```

`stock-investment/tasks/plan002-skills-folder-retirement/index.json` Edit:
- `updated_at` → 현재 ISO-8601 UTC.
- `status` → `"completed"`.
- `current_phase` → `2`.
- `phases[0].status` → `"completed"`, `phases[0].commitSha` 추가.
- `phases[1].status` → `"completed"` (commitSha는 본 commit 후 trailing cleanup).

## cron 수동 갱신 안내 (commit message 본문)

본 commit 종료 후 사용자가 직접 처리할 작업:

```
~/.openclaw/cron/jobs.json 두 job의 payload.message 안 absolute path 갱신:

1. stock-investing-morning-brief-0800:
   /home/bifos/ai-nodes/stock-investment/skills/stock-investing-morning-brief/scripts/run_report.sh
   →
   /home/bifos/ai-nodes/stock-investment/scripts/stock-investing-morning-brief/run_report.sh

2. daily-ai-tech-stock-blog-note:
   ~/ai-nodes/stock-investment/skills/daily-stock-analysis-note/scripts/run_daily_note.sh
   →
   ~/ai-nodes/stock-investment/scripts/daily-stock-analysis-note/run_daily_note.sh

(current-issue-analysis는 cron 등록 없음 — 사용자 수동 호출만)

갱신 방법: openclaw cron 명령 또는 jobs.json 직접 편집 — openclaw 측에서 직접 처리 (ai-nodes 측 자동화 금지, openclaw_safety 정책).
```

본 안내는 commit message 본문 + Discord 알림에 포함.

## commit + push

```bash
cd "$(git rev-parse --show-toplevel)"

git add stock-investment/tasks/plan002-skills-folder-retirement/index.json

git status --porcelain | grep -E "^(A|M|D|R) " | head
# 의도 외 staged 파일 0 — cross-session race 회피.

git commit -m "task(stock-investment): plan002 status=completed + cron 수동 갱신 안내 (phase-02)

- phase-01 commitSha 후기록
- ADR-006 분리 패턴 마이그 완료 (3 skill, 4 runner SKILL_ROOT/path 갱신)
- 옛 skills/ 디렉터리 git rm 완료

cron payload 수동 갱신 필요 (openclaw_safety 정책상 ai-nodes 측 자동화 금지):
- ~/.openclaw/cron/jobs.json stock-investing-morning-brief-0800 payload.message
  /home/bifos/ai-nodes/stock-investment/skills/stock-investing-morning-brief/scripts/run_report.sh
  → /home/bifos/ai-nodes/stock-investment/scripts/stock-investing-morning-brief/run_report.sh
- ~/.openclaw/cron/jobs.json daily-ai-tech-stock-blog-note payload.message
  ~/ai-nodes/stock-investment/skills/daily-stock-analysis-note/scripts/run_daily_note.sh
  → ~/ai-nodes/stock-investment/scripts/daily-stock-analysis-note/run_daily_note.sh

후속: plan003 (AGENTS.md 강화 + 다른 워크스페이스 audit) → plan004 (decisions/ 폐기 + workspace-structure ✓).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"

git push origin main
```

## 금지 사항

- 신규 파일 생성 (index.json Edit만).
- phase-01 산출 (scripts/ + .claude/skills/) 수정.
- config / data / docs 변경.
- ADR 본문 수정.
- ~/.openclaw/ 어떤 파일도 수정 — openclaw_safety 정책. 안내만.
- 다른 워크스페이스 파일 stage.
- amend / force push.

## PHASE_BLOCKED / PHASE_FAILED 조건

- phase-01 commit 부재 — `PHASE_FAILED: phase-01 commit 누락 또는 cross-session race`.
- 옛 skills/ 잔존 (성공 기준 2) — `PHASE_FAILED: phase-01 마이그 회귀`.
- 새 트리 incomplete (성공 기준 3) — `PHASE_FAILED: 트리 정합 실패`.
- shell syntax 오류 (성공 기준 4) — `PHASE_FAILED: runner syntax 회귀`.
- 옛 SKILL_ROOT 잔존 (성공 기준 5) — `PHASE_FAILED: runner 갱신 누락`.
- docs 정합 실패 (성공 기준 6) — `PHASE_FAILED: docs commit 미적용 — 6a3b902 push 확인`.
- 의도 외 staged 파일 — `PHASE_BLOCKED: cross-session stage race`.
- push 거절 — `PHASE_BLOCKED: push 거절 — 사용자 검토 필요`.
