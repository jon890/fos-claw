# Phase 2 — ADR-006 분리 마이그 (3 skill skills/<name>/ → .claude/skills/<name>/)

health-care plan002 phase-02. ai-nodes ADR-006 분리 표준 적용. 3 skill 디렉터리 통째 이동.

health-care는 *실행 코드 0건* (SKILL.md만, scripts/ 부재). 분리 마이그가 *path 변경*만 — runner SKILL_ROOT 갱신 불필요 (stock-investment plan002 / apartment plan007과 다름).

## 작업 위치

run-phases.py가 `cwd=health-care/`로 실행:
```bash
cd "$(git rev-parse --show-toplevel)"
```

## 관련 docs

- `ai-nodes/docs/adr.md` ADR-006 — 분리 표준 본문.
- `ai-nodes/docs/workspace-structure.md` 6번 — skills/ 컨벤션 (`.claude/skills/<skill-name>/SKILL.md` + references/).
- `health-care/AGENTS.md` — skills/ 트리 참조.
- `health-care/docs/code-architecture.md` — skills/ 트리 표기.
- `health-care/skills/` — 이동 대상 (3 skill 디렉터리).

## 변경할 파일

이동 (git mv — 3 skill 디렉터리 통째):

- `health-care/skills/daily-knee-rehab-checkin/` → `health-care/.claude/skills/daily-knee-rehab-checkin/`
- `health-care/skills/knee-progress-intake/` → `health-care/.claude/skills/knee-progress-intake/`
- `health-care/skills/weekly-knee-clinic-summary/` → `health-care/.claude/skills/weekly-knee-clinic-summary/`

삭제:
- `health-care/skills/` 빈 디렉터리 rmdir

수정 (Edit — 트리 표기 갱신):
- `health-care/AGENTS.md` — skills/ 참조 → .claude/skills/
- `health-care/docs/code-architecture.md` — 트리 갱신

본 phase에서 *config / data / 5문서 본문 변경 0*. *runner 코드 변경 0* (실행 코드 부재).

## 명세

### 1. .claude/skills/ 디렉터리 신설

```bash
cd "$(git rev-parse --show-toplevel)"
mkdir -p health-care/.claude/skills
```

### 2. 3 skill git mv

```bash
cd "$(git rev-parse --show-toplevel)"
git mv health-care/skills/daily-knee-rehab-checkin health-care/.claude/skills/daily-knee-rehab-checkin
git mv health-care/skills/knee-progress-intake health-care/.claude/skills/knee-progress-intake
git mv health-care/skills/weekly-knee-clinic-summary health-care/.claude/skills/weekly-knee-clinic-summary

# 빈 skills/ rmdir
rmdir health-care/skills
```

skill 디렉터리 안 자산 (SKILL.md + references/* 있을 수 있음)은 git mv가 *재귀 이동*. 본문 보존.

### 3. AGENTS.md 트리 표기 갱신

`health-care/AGENTS.md` 안 `skills/` 참조를 모두 `.claude/skills/`로 갱신:
- "디렉터리" 섹션 또는 "현재 관리 트랙" 섹션 점검
- 본문에 `skills/<name>` 표기가 있으면 `.claude/skills/<name>`로 갱신

### 4. code-architecture.md 트리 갱신

`health-care/docs/code-architecture.md` 안 `skills/<name>/` 표기를 모두 `.claude/skills/<name>/`로 갱신. 디렉터리 트리 본문이 plan001에서 작성된 옛 통합 패턴이면 *plan002 분리 패턴*으로 재구성. ADR-006 표준 참조 인용 추가.

## 성공 기준

```bash
cd "$(git rev-parse --show-toplevel)"

# 1. 옛 skills/ 부재
test ! -d health-care/skills || (echo "FAIL: 옛 skills/ 잔존" && exit 1)
echo "[옛 skills/ 부재] OK"

# 2. 새 .claude/skills/ 3 skill 존재
for s in daily-knee-rehab-checkin knee-progress-intake weekly-knee-clinic-summary; do
  test -f "health-care/.claude/skills/$s/SKILL.md" || (echo "FAIL: $s/SKILL.md 부재" && exit 1)
done
echo "[3 skill SKILL.md] OK"

# 3. AGENTS.md / code-architecture.md 옛 skills/ 참조 0
LEFT=$(grep -E "skills/<name>|skills/daily-knee|skills/knee-progress|skills/weekly-knee" health-care/AGENTS.md health-care/docs/code-architecture.md 2>&1 | grep -v ".claude/skills/" | wc -l)
test "$LEFT" -eq 0 || (echo "FAIL: 옛 skills/ 참조 $LEFT 잔존" && exit 1)
echo "[옛 skills/ 참조 0] OK"

# 4. ADR-006 인용 (선택)
grep -q "ADR-006" health-care/docs/code-architecture.md && echo "[ADR-006 인용] OK" || echo "(ADR-006 인용 없음 — 선택사항)"

# 5. cron payload 영향 확인 (skills/ 참조 0)
! grep -q "/skills/" <(cat ~/.openclaw/cron/jobs.json | python3 -c "
import json, sys
d = json.load(sys.stdin)
jobs = d if isinstance(d, list) else d.get('jobs', [d])
for j in jobs:
    if 'knee' in (j.get('name') or '').lower():
        print(j.get('payload', {}).get('message', ''))
")
echo "[cron skills/ 참조 0] OK"
```

## 금지 사항

- 5문서 본문 변경 (prd / data-schema / flow / adr) — 트리 표기만.
- SKILL.md 본문 변경.
- config / data 변경.
- cron payload 수정 (skills/ 참조 0이라 불필요, 또 openclaw_safety는 사용자 명시 허용 시만).
- ADR 신설.
- amend / force push.

## commit

```bash
cd "$(git rev-parse --show-toplevel)"
git add health-care/AGENTS.md health-care/docs/code-architecture.md health-care/.claude/

git status --porcelain | grep -E "^(A|M|D|R) " | head
# 의도 외 staged 파일 0.

git commit -m "refactor(health-care): ADR-006 분리 마이그 (plan002 phase-02)

- skills/<name>/ → .claude/skills/<name>/ 3 skill 통째 이동
- AGENTS.md / code-architecture.md 트리 표기 갱신
- 실행 코드 0 — SKILL.md만 이동 (runner SKILL_ROOT 갱신 불필요)
- cron payload 영향 0 (skills/ 참조 부재 확인)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

## PHASE_BLOCKED / PHASE_FAILED

- 3 skill 중 디렉터리 부재 — `PHASE_BLOCKED`.
- 옛 skills/ 잔존 (검증 1) — `PHASE_FAILED: rmdir 누락 또는 자산 보존`.
- 옛 skills/ 참조 잔존 (검증 3) — `PHASE_FAILED: docs 갱신 누락`.
- 의도 외 staged 파일 — `PHASE_BLOCKED`.
