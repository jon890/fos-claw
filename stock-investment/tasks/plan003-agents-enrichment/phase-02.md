# Phase 2 — 통합 검증 + status=completed + push

stock-investment plan003 phase-02 (마지막). phase-01 산출 검증, index.json status=completed, origin/main push.

## 작업 위치 (cwd 정책)

run-phases.py가 본 phase를 `cwd=stock-investment/` (워크스페이스)로 실행. 첫 bash 블록:

```bash
cd "$(git rev-parse --show-toplevel)"
```

## 검증 절차

```bash
cd "$(git rev-parse --show-toplevel)"

# 1. phase-01 commit 존재
PHASE_01_SHA="$(git log --format='%H' --grep='plan003 phase-01' -n 1 | cut -c1-12)"
test -n "$PHASE_01_SHA" || (echo "PHASE_FAILED: phase-01 commit 누락" && exit 1)
echo "[phase-01 SHA] $PHASE_01_SHA"

# 2. AGENTS.md 강화 검증
LINES=$(wc -l < stock-investment/AGENTS.md)
test "$LINES" -ge 100 || (echo "PHASE_FAILED: 강화 부실 ($LINES)" && exit 1)

grep -q "^## 4-1. 진실 출처" stock-investment/AGENTS.md
grep -q "^## 4-2. 투자 컨텍스트" stock-investment/AGENTS.md

for c in catalysts current-issues daily-stock-universe sources theme-reports watchlist; do
  grep -q "$c.json" stock-investment/AGENTS.md || (echo "PHASE_FAILED: $c.json 누락" && exit 1)
done

grep -q "08:00 Asia/Seoul\|0 8 \* \* \*" stock-investment/AGENTS.md
grep -q "09:00 Asia/Seoul\|0 9 \* \* \*" stock-investment/AGENTS.md

! grep -q "plan003에서 실 .env 도입" stock-investment/AGENTS.md
grep -q "\.env.*gitignore" stock-investment/AGENTS.md
echo "[AGENTS 강화] OK"

# 3. 8 섹션 골격 + 4-1/4-2 (총 10) 보존
SECTIONS=$(grep -c "^## " stock-investment/AGENTS.md)
test "$SECTIONS" -ge 10 || (echo "PHASE_FAILED: 섹션 $SECTIONS 미만 (10 기대)" && exit 1)
echo "[섹션 $SECTIONS] OK"

# 4. 다른 워크스페이스 / 5문서 / scripts 변경 0
git log --format='%H' HEAD~2..HEAD --name-only | grep -v "^stock-investment/AGENTS.md\|^stock-investment/tasks/plan003\|^$\|^[a-f0-9]\{40\}$" && (echo "PHASE_FAILED: scope creep" && exit 1) || true
echo "[스코프 격리] OK"

# 5. docs-style 정합
! grep -n "§" stock-investment/AGENTS.md
echo "[section mark 0] OK"
```

성공 기준: 1-5 모두 통과.

## index.json 갱신

```bash
cd "$(git rev-parse --show-toplevel)"

PHASE_01_SHA="$(git log --format='%H' --grep='plan003 phase-01' -n 1 | cut -c1-12)"
test -n "$PHASE_01_SHA" || (echo "PHASE_FAILED: SHA 추출 실패" && exit 1)
```

`stock-investment/tasks/plan003-agents-enrichment/index.json` Edit:
- `updated_at` → 현재 ISO-8601 UTC.
- `status` → `"completed"`.
- `current_phase` → `2`.
- `phases[0].status` → `"completed"`, `phases[0].commitSha` 추가.
- `phases[1].status` → `"completed"` (commitSha는 trailing cleanup).

## commit + push

```bash
cd "$(git rev-parse --show-toplevel)"

git add stock-investment/tasks/plan003-agents-enrichment/index.json

git status --porcelain | grep -E "^(A|M|D|R) " | head
# 의도 외 staged 파일 0 — cross-session race 회피.

git commit -m "task(stock-investment): plan003 status=completed (phase-02)

- phase-01 commitSha 후기록
- AGENTS.md 강화 완료 (73 → 100+ 라인, 4-1 진실 출처 + 4-2 투자 컨텍스트 + 5 cron 시점 표 + 8 .env 정합)
- career-os 패턴 차용 + stock-investment 도메인 맞춤 보강

후속: plan004 (decisions/* 7 파일 git rm + workspace-structure 매트릭스 ✓ 갱신 + ADR-021 정합 표기).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"

git push origin main
```

## 금지 사항

- 신규 파일 생성 (index.json Edit만).
- AGENTS.md 추가 수정 (phase-01 산출 보존).
- 5문서 / scripts / config / .env 수정.
- 다른 워크스페이스 파일 stage.
- amend / force push.

## PHASE_BLOCKED / PHASE_FAILED 조건

- phase-01 commit 부재 — `PHASE_FAILED: phase-01 누락 또는 cross-session race`.
- AGENTS.md 검증 fail (성공 기준 2/3) — `PHASE_FAILED: 강화 부실`.
- 의도 외 staged 파일 — `PHASE_BLOCKED: cross-session stage race`.
- push 거절 — `PHASE_BLOCKED`.
