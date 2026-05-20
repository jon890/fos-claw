# Phase 4 — 통합 검증 + status=completed + push

health-care plan002 phase-04 (마지막). phase-01~03 산출 검증, index.json status=completed, origin/main push.

## 작업 위치

```bash
cd "$(git rev-parse --show-toplevel)"
```

## 검증 절차

```bash
cd "$(git rev-parse --show-toplevel)"

# 1. 3 phase commit 존재
P1="$(git log --format='%H' --grep='health-care.*plan002 phase-01\|workflow.md → flow.md' -n 1 | cut -c1-12)"
P2="$(git log --format='%H' --grep='health-care.*plan002 phase-02\|ADR-006 분리.*health-care' -n 1 | cut -c1-12)"
P3="$(git log --format='%H' --grep='health-care.*plan002 phase-03\|workspace-structure 5번째' -n 1 | cut -c1-12)"
test -n "$P1" -a -n "$P2" -a -n "$P3" || (echo "PHASE_FAILED: phase commit 누락 — P1=$P1 P2=$P2 P3=$P3" && exit 1)
echo "[3 phase commit] OK"

# 2. flow.md 정합
test -f health-care/docs/flow.md
test ! -f health-care/docs/workflow.md
! grep -rn "workflow\.md" health-care/AGENTS.md health-care/docs/*.md
echo "[flow.md 명명 정합] OK"

# 3. .claude/skills/ 3 skill + 옛 skills/ 부재
test ! -d health-care/skills
for s in daily-knee-rehab-checkin knee-progress-intake weekly-knee-clinic-summary; do
  test -f "health-care/.claude/skills/$s/SKILL.md" || (echo "PHASE_FAILED: $s/SKILL.md 부재" && exit 1)
done
echo "[ADR-006 분리] OK"

# 4. .env / .env.example
test -f health-care/.env
test -f health-care/.env.example
grep -q "^DISCORD_CHANNEL_ID=" health-care/.env
test -z "$(git ls-files health-care/.env)"
echo "[.env + .env.example + untracked] OK"

# 5. workspace-structure 5개 + health-care 행
grep -q "현재 워크스페이스 5개" docs/workspace-structure.md
grep -q "^| \`health-care/\` |" docs/workspace-structure.md
grep -q "health-care | O" docs/workspace-structure.md
echo "[workspace-structure 매트릭스] OK"

# 6. AGENTS.md (모노레포) health-care 진입점
grep -q "\`health-care/\`" AGENTS.md
echo "[모노레포 AGENTS health-care] OK"

# 7. docs-style § 사용 0
! grep -n "§" health-care/AGENTS.md health-care/docs/*.md docs/workspace-structure.md AGENTS.md
echo "[section mark 0] OK"
```

## index.json 갱신

```bash
cd "$(git rev-parse --show-toplevel)"

P1="$(git log --format='%H' --grep='health-care.*plan002 phase-01\|workflow.md → flow.md' -n 1 | cut -c1-12)"
P2="$(git log --format='%H' --grep='health-care.*plan002 phase-02\|ADR-006 분리.*health-care' -n 1 | cut -c1-12)"
P3="$(git log --format='%H' --grep='health-care.*plan002 phase-03\|workspace-structure 5번째' -n 1 | cut -c1-12)"
echo "P1=$P1 P2=$P2 P3=$P3"
```

`health-care/tasks/plan002-workspace-standard-completion/index.json` Edit:
- `updated_at` → 현재 ISO-8601 UTC.
- `status` → `"completed"`.
- `current_phase` → `4`.
- `phases[0/1/2].status` → `"completed"`, 각 `commitSha` 추가.
- `phases[3].status` → `"completed"` (commitSha는 trailing cleanup).

## commit + push

```bash
cd "$(git rev-parse --show-toplevel)"
git add health-care/tasks/plan002-workspace-standard-completion/index.json

git status --porcelain | grep -E "^(A|M|D|R) " | head
# 의도 외 staged 파일 0.

git commit -m "task(health-care): plan002 status=completed (phase-04) — 표준 적용 완료

- phase-01/02/03 commitSha 후기록
- workflow.md → flow.md (5문서 명명 정합)
- ADR-006 분리 마이그 (3 skill skills/ → .claude/skills/)
- .env 도입 + .env.example template
- ai-nodes/docs/workspace-structure.md 5번째 워크스페이스 행 + 매트릭스
- ai-nodes/AGENTS.md 모노레포 진입점 health-care 추가

health-care 표준 준수율 100% (8/8). 매트릭스 (5 워크스페이스):
- apartment / career-os / stock-investment / health-care: 표준 적용 완료
- travel: 잔존 — 별도 plan001

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"

git push origin main
```

## 금지 사항

- 신규 파일 생성 (index.json Edit만).
- phase-01/02/03 산출 수정.
- 다른 워크스페이스 파일 stage.
- amend / force push.

## PHASE_BLOCKED / PHASE_FAILED

- 3 phase commit 중 누락 — `PHASE_FAILED: phase 누락 또는 cross-session race`.
- 검증 2-7 fail — `PHASE_FAILED: 정합 부실`.
- 의도 외 staged 파일 — `PHASE_BLOCKED`.
- push 거절 — `PHASE_BLOCKED`.
