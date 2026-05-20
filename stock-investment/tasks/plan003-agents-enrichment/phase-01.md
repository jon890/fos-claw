# Phase 1 — AGENTS.md 강화 (진실 출처 + 투자 컨텍스트 + cron 시점 + .env 정합)

stock-investment plan003 phase-01. AGENTS.md 본문을 career-os 패턴 차용으로 강화. 현재 73 라인 → 100+ 라인 목표.

본 phase는 *AGENTS.md 단일 파일* 강화. 5문서 / scripts / config 변경 0.

## 작업 위치 (cwd 정책)

run-phases.py가 본 phase를 `cwd=stock-investment/` (워크스페이스)로 실행. 첫 bash 블록:

```bash
cd "$(git rev-parse --show-toplevel)"
```

## 관련 docs (먼저 읽기)

**강화 패턴 차용 원본**:
- `career-os/AGENTS.md` — "5문서 라우팅 가이드" + "후보자 포커스" + "진실 출처" + "운영 원칙" + "규칙" 9 섹션 풍부도 참고.

**보강 자료** (stock-investment 5문서 본문에서 발췌):
- `stock-investment/docs/prd.md` — MVP 타깃 + 기능 표 + 미연결 항목.
- `stock-investment/docs/data-schema.md` — 6 config json 스키마 (catalysts / current-issues / daily-stock-universe / sources / theme-reports / watchlist) + 산출물 경로.
- `stock-investment/docs/flow.md` — 3 skill 데이터 흐름 + cron 호출 시점.
- `stock-investment/.env` (실 파일 — 본 phase에선 *읽지 않음*. 단 .env.example 본문은 점검).

**cron 호출 시점·빈도** (참고만, 본 phase에선 jobs.json 수정 0):
- `stock-investing-morning-brief-0800` — 매일 08:00 Asia/Seoul (cron `0 8 * * *`), agent: main, isolated session, failureAlert → Discord 채널.
- `daily-ai-tech-stock-blog-note` — 매일 09:00 Asia/Seoul (cron `0 9 * * *`), agent: main, isolated session, delivery → Discord 채널 announce.
- `current-issue-analysis` — cron 등록 0 (사용자 수동 호출만, 토픽 단위).

## 변경할 파일

수정:

- `stock-investment/AGENTS.md`

본 phase에서 *새 파일 생성 금지*. *5문서 / scripts / config / .env 수정 금지*. *.claude/skills/ 수정 금지*.

## 강화 영역 명세

### 1. "진실 출처" 섹션 신설 (career-os 패턴 차용)

현재 AGENTS.md L26-29 "4. 현재 타깃" 다음에 신설. career-os/AGENTS.md "진실 출처" 섹션 패턴 적용 — 단 stock-investment 도메인에 맞춰 *config json + 외부 cron + Discord 채널 + 외부 git repo*로 재구성.

신설 섹션 골격 (`## 4-1. 진실 출처`):

```markdown
## 4-1. 진실 출처

각 자산이 *어디서 정의되고 어디로 발행되는지* 단일 출처:

- **종목·테마 정의**: `config/watchlist.json` (CRCL/BTC/GOOGL/QQQ 등 기본 watch) + `config/catalysts.json` (테마별 catalyst 이벤트) + `config/theme-reports.json` (Core+Theme 구조 메타데이터).
- **현안 토픽 큐**: `config/current-issues.json` — issue-analysis skill이 토픽 단위로 분석.
- **수집 소스**: `config/sources.json` — morning-brief가 뉴스·가격 fetch.
- **daily-note 후보 풀**: `config/daily-stock-universe.json` — daily-stock-analysis-note skill이 매일 1 종목 선택.
- **종목 선택 이력**: `data/daily-notes/history.json` — rotation 패널티 적용 (같은 종목 연속 선택 방지).
- **투자 가설 누적**: `data/thesis-tracker/<ticker>.json` — 종목별 시계열 thesis 추적.
- **외부 발행 대상**: `career-os/sources/fos-study/` — daily-stock-analysis-note만 git push (cross-workspace 단방향 쓰기, ADR-001 격리 원칙 의도된 예외).
- **비밀 정보**: `.env` (워크스페이스 root, gitignore) — `DISCORD_CHANNEL_ID` 등.
- **운영 상태 (cron)**: `~/.openclaw/cron/jobs.json` (openclaw 측 자산, 읽기 전용 참조).

회사명·티커·테마를 어떤 markdown에도 박지 않는다 — config json 한 곳만 수정해서 전환.
```

### 2. "투자 컨텍스트" 섹션 신설 (career-os "후보자 포커스" 대응)

현재 L26-29 "4. 현재 타깃" 보강 또는 *4-2 투자 컨텍스트* 신설. career-os 패턴은 *후보자 약점·강점 정보*를 명시하지 않는다 — 본 섹션도 *구체 투자 의견은 안 박음*. 대신 *관찰 원칙*만 명시:

```markdown
## 4-2. 투자 컨텍스트

- **관찰·분석 한정**: 실시간 거래 자동화 / 매수·매도 의사결정 자동화 *금지*. 본 워크스페이스는 *시장 관찰 + 정보 정리 + 학습 자산 생성*만 책임.
- **재무 자문 아님**: 모든 산출물은 *개인 학습용*. blog 발행물에도 명시.
- **테마 단위 추적**: 종목 개별보다 *테마 (AI 반도체 / 인프라 / 금융 서비스 / 암호화폐 등)* 단위로 catalyst·뉴스 묶음.
- **검증된 사실·해석 분리**: 가격·뉴스 timestamp는 *수집 raw* 보존 + Claude 해석은 *별도 섹션*.
- **불확실성 명시**: 추측·예측은 *추측이라 명시*. 사실로 위장 금지.
- **세션 격리**: 각 cron job은 `sessionTarget: isolated` — 다른 워크스페이스 컨텍스트 누수 회피.
```

### 3. "워크플로 진입점" 섹션 보강 (cron 시점·빈도 명시)

현재 L31-47 "5. 워크플로 진입점" 보강. 분리 패턴 진입점 + 호출 시점·빈도 + 운영 상태 매핑:

```markdown
## 5. 워크플로 진입점

3 skill — ADR-006 분리 패턴 (`scripts/<name>/` + `.claude/skills/<name>/`, plan002 적용).

| skill | 호출 시점 | 트리거 | 산출물 발행 |
|---|---|---|---|
| `stock-investing-morning-brief` | 매일 08:00 Asia/Seoul | cron `0 8 * * *` (openclaw, isolated session) | Discord 채널 announce (failureAlert) |
| `daily-stock-analysis-note` | 매일 09:00 Asia/Seoul | cron `0 9 * * *` (openclaw, isolated session) | Discord delivery + `career-os/sources/fos-study/` git push |
| `current-issue-analysis` | 사용자 수동 호출 | 자연어 또는 슬래시 | Discord 알림 (선택) |

```bash
# native skill 진입점 (.claude/skills/ 자동 로드)
claude -p "/stock-investing-morning-brief"
claude -p "/current-issue-analysis <issue-key>"
claude -p "/daily-stock-analysis-note"

# 또는 직접 호출 (cron payload가 사용하는 absolute path)
bash $HOME/ai-nodes/stock-investment/scripts/stock-investing-morning-brief/run_report.sh
bash $HOME/ai-nodes/stock-investment/scripts/current-issue-analysis/run_issue_report.sh
bash $HOME/ai-nodes/stock-investment/scripts/daily-stock-analysis-note/run_daily_note.sh
```

cron payload 갱신 이력: plan002 phase-01 (분리 마이그) 완료 후 `openclaw cron edit` 으로 `skills/<name>/scripts/` → `scripts/<name>/` 갱신 완료 (2026-05-20).
```

### 4. ".env 정합 표기" — 기존 L62 갱신

현재 라인:
```
- 비밀 정보 (`DISCORD_CHANNEL_ID`)는 `.env` (워크스페이스 root, ADR-021 예정 — plan003에서 실 .env 도입).
```

→ 갱신 (실 .env 도입 완료 반영):

```
- 비밀 정보 (`DISCORD_CHANNEL_ID`)는 `.env` (워크스페이스 root, gitignore). 출처: `~/.openclaw/cron/jobs.json` 추출. `.env.example` template 참고.
```

### 5. AGENTS.md 골격 보존

기존 8 섹션 (1. 5문서 라우팅 / 2. tasks 영역 / 3. 목적 / 4. 현재 타깃 / 5. 워크플로 진입점 / 6. 외부 의존성 / 7. 운영 원칙 / 8. 규칙) **모두 보존**. 4-1 / 4-2 두 서브섹션 추가 + 5번 보강 + 8번 라인 1 갱신.

번호 매기기 — 4-1 / 4-2 형태로 *서브넘버* 사용 (career-os AGENTS.md는 번호 없는 섹션 헤더지만, stock-investment는 *번호 매김* 컨벤션 유지).

### 6. cross-link 정합 점검

- `docs/prd.md` 참조 라인 (현재 L29) 유지
- `docs/code-architecture.md` 참조 라인 (현재 L57) 유지
- `~/.openclaw/cron/jobs.json` 참조는 *읽기 전용* — 인용만 (수정 안내 없음, plan002 phase-02에서 처리됨)

## 성공 기준

```bash
cd "$(git rev-parse --show-toplevel)"

# 1. AGENTS.md 라인 100+ (강화 효과)
LINES=$(wc -l < stock-investment/AGENTS.md)
test "$LINES" -ge 100 || (echo "FAIL: AGENTS.md $LINES 라인 — 100 미만" && exit 1)
echo "[라인 수 $LINES] OK"

# 2. 4-1 진실 출처 섹션 신설
grep -q "^## 4-1. 진실 출처" stock-investment/AGENTS.md
echo "[4-1 진실 출처] OK"

# 3. 4-2 투자 컨텍스트 섹션 신설
grep -q "^## 4-2. 투자 컨텍스트" stock-investment/AGENTS.md
echo "[4-2 투자 컨텍스트] OK"

# 4. 6 config json 모두 명시
for c in catalysts current-issues daily-stock-universe sources theme-reports watchlist; do
  grep -q "$c.json" stock-investment/AGENTS.md || (echo "FAIL: $c.json 누락" && exit 1)
done
echo "[6 config 명시] OK"

# 5. cron 시점 표 — 08:00 + 09:00 명시
grep -q "08:00 Asia/Seoul\|0 8 \* \* \*" stock-investment/AGENTS.md
grep -q "09:00 Asia/Seoul\|0 9 \* \* \*" stock-investment/AGENTS.md
echo "[cron 시점] OK"

# 6. .env 정합 (plan003 도입 예정 표기 제거)
! grep -q "plan003에서 실 .env 도입" stock-investment/AGENTS.md
grep -q "\.env.*gitignore" stock-investment/AGENTS.md
echo "[.env 정합] OK"

# 7. 8 섹션 골격 보존
SECTIONS=$(grep -c "^## " stock-investment/AGENTS.md)
test "$SECTIONS" -ge 8 || (echo "FAIL: 섹션 $SECTIONS — 8 미만 (4-1/4-2 추가로 10 기대)" && exit 1)
echo "[섹션 골격] OK ($SECTIONS)"

# 8. docs-style 정합 — § 사용 0
! grep -n "§" stock-investment/AGENTS.md
echo "[section mark 0] OK"

# 9. 5문서 / scripts / .claude/skills/ / config 변경 0
git diff HEAD --name-only | grep -v "^stock-investment/AGENTS.md\|^stock-investment/tasks/plan003" && (echo "FAIL: 의도 외 영역 변경" && exit 1) || true
echo "[스코프 격리] OK"
```

## 금지 사항

- 5문서 / scripts / .claude/skills/ / config / .env 변경.
- ADR 본문 수정.
- 다른 워크스페이스 파일 수정.
- 8 섹션 골격 변경 (제거 / 재배치) — 보강만.
- 4-1 / 4-2가 아닌 다른 위치에 신설 — 4번 "현재 타깃" 다음 위치 유지.
- amend / force push.
- section mark (U+00A7) 직접 입력.

## commit

```bash
cd "$(git rev-parse --show-toplevel)"

git add stock-investment/AGENTS.md

git status --porcelain | grep -E "^(A|M|D|R) " | head
# 의도 외 staged 파일 0 — cross-session race 회피.

git commit -m "docs(stock-investment): AGENTS.md 강화 — 진실 출처 + 투자 컨텍스트 + cron 시점 (plan003 phase-01)

career-os AGENTS.md 패턴 차용 + stock-investment 도메인 맞춤 보강:
- 4-1 진실 출처 (6 config json + sources/watchlist/catalysts + cron + Discord + fos-study)
- 4-2 투자 컨텍스트 (관찰·분석 한정 + 재무 자문 아님 + 테마 단위 + 불확실성 명시 + 세션 격리)
- 5번 워크플로 진입점 — cron 시점 표 (08:00 morning + 09:00 daily) + native skill / 직접 호출 path
- 8번 .env 정합 (plan001 phase-02 본문 'plan003 도입 예정' → '도입 완료' 정정)

AGENTS.md 73 라인 → 100+ 라인. 8 섹션 골격 보존 + 4-1/4-2 서브 추가.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

push 없음 (phase-02 책임).

## PHASE_BLOCKED / PHASE_FAILED 조건

- AGENTS.md 라인 100 미만 (성공 기준 1) — `PHASE_FAILED: 강화 부실`.
- 4-1 / 4-2 섹션 신설 누락 (성공 기준 2/3) — `PHASE_FAILED: 강화 섹션 누락`.
- config json 명시 누락 (성공 기준 4) — `PHASE_FAILED: 진실 출처 부실`.
- 의도 외 영역 변경 (성공 기준 9) — `PHASE_FAILED: scope creep`.
- 의도 외 staged 파일 — `PHASE_BLOCKED: cross-session stage race`.
- section mark 사용 발견 — `PHASE_FAILED: docs-style 위반`.
