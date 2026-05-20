# Phase 3 — .env + .env.example + workspace-structure 5번째 워크스페이스

health-care plan002 phase-03. `.env` / `.env.example` 신설 + ai-nodes 모노레포 docs (workspace-structure.md + AGENTS.md)에 health-care 5번째 워크스페이스로 추가.

## 작업 위치

run-phases.py가 `cwd=health-care/`로 실행:
```bash
cd "$(git rev-parse --show-toplevel)"
```

## 관련 docs

- `ai-nodes/docs/workspace-structure.md` L15 / L17-22 / L155-160 / L170 — 모노레포 청사진.
- `ai-nodes/AGENTS.md` (= CLAUDE.md) L13~20 — 모노레포 진입점 표.
- `~/.openclaw/cron/jobs.json` health-care:knee-morning — Discord 채널 ID 출처.
- `stock-investment/.env` — 다른 워크스페이스 .env 패턴 참고.

## 변경할 파일

신설:
- `health-care/.env` (gitignore — `.gitignore`에 `.env` 패턴 이미 등록)
- `health-care/.env.example` (template, git tracked)

수정:
- `ai-nodes/docs/workspace-structure.md` L15 / L17-22 / L155-160 / L170 매트릭스
- `ai-nodes/AGENTS.md` L13~20 진입점 표

## 명세

### 1. health-care/.env 신설

```bash
cd "$(git rev-parse --show-toplevel)"
cat > health-care/.env <<'EOF'
# health-care 워크스페이스 환경 변수.
# .gitignore에 .env 패턴 — git tracked 안 됨.
# 출처: ~/.openclaw/cron/jobs.json (health-care:knee-morning-rehab-checkin).

DISCORD_CHANNEL_ID=1505499197049278535
TZ=Asia/Seoul
EOF
```

### 2. health-care/.env.example 신설

```bash
cat > health-care/.env.example <<'EOF'
# health-care 워크스페이스 환경 변수 template.
# 실 .env는 워크스페이스 root에 위치 (ai-nodes ADR-004 / career-os ADR-021).

# Discord 알림 (openclaw message send 경유)
DISCORD_CHANNEL_ID=
# 예: #병태건강 채널 id (cron job env에서 추출)

# 타임존
TZ=Asia/Seoul
EOF
```

### 3. ai-nodes/docs/workspace-structure.md 갱신 (3 영역)

**(a) L15 "현재 워크스페이스 4개" → 5개**:

```
현재 워크스페이스 4개:
→
현재 워크스페이스 5개:
```

**(b) L17-22 워크스페이스 표 — health-care 행 추가**:

travel 행 다음에 추가:
```
| `health-care/` | `health-care/AGENTS.md` | 무릎 재활 daily 체크인 (knee-patellar-instability) |
```

**(c) L155-160 의도된 비대칭 표 — health-care 행 추가** (ADR-006 적용 완료):

```
| health-care | 없음 (ADR-006 분리 표준 적용, plan002) | — |
```

**(d) L170 준수도 매트릭스 — 5번째 컬럼 추가**:

기존 4 컬럼 (apartment / career-os / stock-investment / travel) → 5 컬럼 (+ health-care).

7행 각각 health-care 컬럼 값:
- AGENTS.md 존재 = O
- CLAUDE.md 심링크 = O
- docs/ 5문서 = O (plan002 phase-01)
- tasks/plan{N}/ = O (plan001~002)
- skills/ 분리 표준 (ADR-006) = 적용 (plan002)
- .claude/skills/ native 등록 = O (plan002)
- .env (workspace root) = O (plan002)
- data/ vs docs/ 분리 = O

**(e) L181 안내 갱신**:

옛:
```
travel만 별도 workspace-audit 실행 후 갱신 예정. stock-investment는 plan001~004 시리즈로 완료.
```

새:
```
travel만 별도 workspace-audit 실행 후 갱신 예정. stock-investment는 plan001~004 시리즈로 완료. health-care는 plan002로 완료.
```

### 4. ai-nodes/AGENTS.md (= CLAUDE.md) 진입점 표 — health-care 행 추가

L13-20 워크스페이스 매트릭스에 travel 다음 행으로 추가:

```
| `health-care/` | [`health-care/AGENTS.md`](health-care/AGENTS.md) | 무릎 재활 daily 체크인 (knee-patellar-instability, cron 08:30 KST) |
```

또 "현재 워크스페이스 4개"라는 표기가 있으면 *5개*로 갱신.

## 성공 기준

```bash
cd "$(git rev-parse --show-toplevel)"

# 1. .env 신설 + DISCORD_CHANNEL_ID 정합
test -f health-care/.env
grep -q "^DISCORD_CHANNEL_ID=1505499197049278535" health-care/.env
echo "[health-care/.env] OK"

# 2. .env.example 신설
test -f health-care/.env.example
grep -q "^DISCORD_CHANNEL_ID=$" health-care/.env.example
echo "[health-care/.env.example] OK"

# 3. .env gitignored (tracked 안 되는지)
test -z "$(git ls-files health-care/.env)"
echo "[.env untracked] OK"

# 4. workspace-structure.md "5개" 표기
grep -q "현재 워크스페이스 5개" docs/workspace-structure.md
echo "[workspace-structure 5개] OK"

# 5. workspace-structure.md health-care 행 (워크스페이스 표 + 비대칭 + 매트릭스)
grep -q "^| \`health-care/\` |" docs/workspace-structure.md
grep -q "health-care | 없음 (ADR-006" docs/workspace-structure.md
grep -q "health-care | O" docs/workspace-structure.md
echo "[workspace-structure health-care 행] OK"

# 6. 모노레포 AGENTS.md health-care 진입점 추가
grep -q "\`health-care/\` |" AGENTS.md
echo "[AGENTS.md health-care 진입점] OK"

# 7. workspace-structure 매트릭스 health-care 7행 O
HC_O=$(grep -E "^\| (AGENTS|CLAUDE|docs/ 5문서|tasks/plan|skills/ 분리|\.claude/skills/|\.env|data/ vs docs/)" docs/workspace-structure.md | awk -F '|' '{print $7}' | grep -c "O")
test "$HC_O" -ge 7 || (echo "FAIL: matrix health-care O 카운트 $HC_O" && exit 1)
echo "[매트릭스 health-care 7행 O] OK"
```

## 금지 사항

- health-care 5문서 / skill / data / config 수정 (phase-01/02 산출 보존).
- 다른 워크스페이스 (apartment / career-os / stock-investment / travel) 파일 수정.
- ADR 신설.
- cron payload 수정.
- amend / force push.
- section mark (U+00A7) 직접 입력.

## commit

```bash
cd "$(git rev-parse --show-toplevel)"
git add health-care/.env.example docs/workspace-structure.md AGENTS.md

# health-care/.env는 gitignored — 자동 untracked
git status --porcelain | grep -E "^(A|M|D|R) " | head

git commit -m "docs(health-care, ai-nodes): .env + workspace-structure 5번째 워크스페이스 추가 (plan002 phase-03)

- health-care/.env 신설 (DISCORD_CHANNEL_ID=1505499197049278535, gitignore)
- health-care/.env.example template (git tracked)
- ai-nodes/docs/workspace-structure.md 5번째 워크스페이스 행 추가 + 비대칭 표 + 매트릭스 health-care 컬럼 (7행 O)
- ai-nodes/AGENTS.md 모노레포 진입점 표 health-care 추가

health-care = 5번째 워크스페이스 표준 적용 완료.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

push 없음 (phase-04 책임).

## PHASE_BLOCKED / PHASE_FAILED

- .env / .env.example 미신설 — `PHASE_FAILED: 신설 누락`.
- workspace-structure / AGENTS health-care 행 누락 — `PHASE_FAILED: 매트릭스 갱신 부실`.
- 매트릭스 health-care O 7행 미달 — `PHASE_FAILED`.
- 의도 외 staged 파일 — `PHASE_BLOCKED`.
