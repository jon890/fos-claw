# Flow — stock-investment

stock-investment 워크스페이스의 **데이터 흐름 및 실행 흐름** 단일 출처.
새 흐름 추가·디버깅 시 이 문서가 기준.

## 1. 전체 흐름 개요

모든 skill runner는 `_shared/bin/track_task.sh` self-wrap 패턴으로 실행된다.

```
사용자/cron
  └─► runner script (run_*.sh)
        └─► self-wrap (TRACK_TASK_WRAPPED guard)
              └─► _shared/bin/track_task.sh
                    ├─► openclaw status 캡처 (before)
                    ├─► 파일 메트릭 스냅샷 (before)
                    │
                    ├─► [skill 본체 실행]
                    │
                    ├─► openclaw status 캡처 (after)
                    ├─► logs/task-runs.jsonl append
                    └─► logs/token-usage.jsonl append
```

## 2. stock-investing-morning-brief 흐름

`skills/stock-investing-morning-brief/scripts/run_report.sh` 진입점.

```
Step 1  self-wrap 체크
        TRACK_TASK_WRAPPED 미설정 시
          → exec track_task.sh "stock-investment:morning-brief" run_report.sh

Step 2  출력 디렉터리 생성
        data/YYYY-MM-DD/ mkdir -p

Step 3  수집 (collect_sources.py)
        입력:
          config/watchlist.json (감시 종목 프로필)
          config/sources.json (뉴스·가격 소스)
        수집 대상:
          종목 가격 (yfinance: CRCL, BTC-USD, QQQ, GOOGL, SMH 등)
          뉴스 소스 (sources.json URL 목록 HTML/JSON 수집)
        산출물:
          data/YYYY-MM-DD/market-data.json
          data/YYYY-MM-DD/raw-news.json

Step 4  analysis-input.md 생성
        references/claude-prompt.md + market-data.json + raw-news.json 결합
        산출물: data/YYYY-MM-DD/analysis-input.md

Step 5  Claude CLI 호출
        claude --output-format json --permission-mode bypassPermissions
        타임아웃: CLAUDE_TIMEOUT_SECONDS (기본 120초)
        산출물: data/YYYY-MM-DD/claude.result.json

Step 6  보고서 추출
        bun run _shared/lib/extract_claude_result.ts
        입력: claude.result.json
        산출물: data/YYYY-MM-DD/report.md

Step 7  fallback (타임아웃 발생 시)
        report.md 에 정적 fallback 마크다운 기록
        (수집 파일 경로 + 재확인 안내 포함)

Step 8  Discord 알림
        skills/stock-investing-morning-brief/scripts/notify_discord.sh
        입력: report.md 전문
        SKIP_NOTIFY=1 로 억제 가능
```

## 3. current-issue-analysis 흐름

`skills/current-issue-analysis/scripts/run_issue_report.sh <issue-key>` 진입점.

```
Step 1  self-wrap 체크
        TRACK_TASK_WRAPPED 미설정 시
          → exec track_task.sh "stock-investment:issue-report" run_issue_report.sh

Step 2  issue-key 결정
        인자 없으면 config/current-issues.json defaultIssue 사용

Step 3  출력 디렉터리 생성
        data/issues/YYYY-MM-DD/<issue-key>/ mkdir -p

Step 4  소스 수집 (collect_issue_sources.py)
        입력: config/current-issues.json (해당 issue의 sources 목록)
        산출물: data/issues/YYYY-MM-DD/<issue-key>/raw-sources.json

Step 5  analysis-input.md 생성
        프롬프트 + raw-sources.json + focusQuestions 결합
        산출물: data/issues/YYYY-MM-DD/<issue-key>/analysis-input.md

Step 6  Claude CLI 호출
        산출물: data/issues/YYYY-MM-DD/<issue-key>/claude.result.json

Step 7  보고서 추출
        bun run _shared/lib/extract_claude_result.ts
        산출물: data/issues/YYYY-MM-DD/<issue-key>/report.md

Step 8  Discord 알림
        보고서 전문 Discord 전송
        SKIP_NOTIFY=1 로 억제 가능
```

트리거 조건 (현재 수동):

- `theme-reports.json` 의 각 theme `triggerCandidates` 참조.
- 대형 변동, 실적 발표 주간, 정책 이벤트 발생 시 수동 실행.
- ai-semiconductor-infrastructure: SMH ±4% 초과 또는 NVDA/AMD/AVGO/TSM 등 ±5% 초과 시
- google-io-alphabet-ai: Google I/O 이벤트 전후 window
- us-clarity-act: CLARITY Act 입법 이벤트 발생 시

## 4. daily-stock-analysis-note 흐름

`skills/daily-stock-analysis-note/scripts/run_daily_note.sh` 진입점.

```
Step 1  self-wrap 체크
        TRACK_TASK_WRAPPED 미설정 시
          → exec track_task.sh "stock-investment:daily-stock-note" run_daily_note.sh

Step 2  출력 디렉터리 생성
        data/daily-notes/YYYY-MM-DD/ mkdir -p

Step 3  종목 선택 + 입력 수집 (collect_daily_note_inputs.py)
        입력:
          config/daily-stock-universe.json (후보 풀: US 17 + KR 13)
          data/daily-notes/history.json (rotation 패널티)
          TICKER 환경변수 (수동 지정 시 우선)
          config/catalysts.json (catalyst 참조)
          data/thesis-tracker/<slug>.json (기존 가설, 파일 존재 시)
        산출물:
          data/daily-notes/YYYY-MM-DD/selected.json (선택 종목 + 근거)
          data/daily-notes/YYYY-MM-DD/raw-inputs.json (종목 뉴스·가격)
        부작용: data/daily-notes/history.json 업데이트

Step 4  analysis-input.md 생성
        references/blog-note-prompt.md + selected.json + raw-inputs.json 결합
        산출물: data/daily-notes/YYYY-MM-DD/analysis-input.md

Step 5  Claude CLI 호출
        산출물: data/daily-notes/YYYY-MM-DD/claude.result.json

Step 6  보고서 추출
        bun run _shared/lib/extract_claude_result.ts
        산출물: data/daily-notes/YYYY-MM-DD/report.md (런타임 초안)

Step 7  fos-study 발행
        sanitize_fos_study_markdown.py 로 fos-study 마크다운 규칙 적용
        BLOG_MD 경로:
          career-os/sources/fos-study/finance/investing/ai-tech-stock/YYYY-MM-DD-<slug>.md
        git add + git commit + git push (SKIP_PUSH=1 로 억제 가능)

Step 8  Discord 알림
        요약 + 발행 경로 Discord 전송
        SKIP_NOTIFY=1 로 억제 가능
```

cross-workspace 쓰기 예외:

- `career-os/sources/fos-study` 는 발행 목적 git 저장소.
- 투자 공부 블로그 노트를 fos-study로 발행하는 단방향 쓰기.
- 워크스페이스 격리 원칙 예외 (decisions/005 기반 — ADR-001 미위반).

## 5. 공통 흐름

모든 skill runner에서 공통으로 발생하는 흐름.

### 5-1. track_task.sh self-wrap

```
run_*.sh 최초 실행
  TRACK_TASK_WRAPPED 미설정
    └─► exec track_task.sh <task_root> <task_id> run_*.sh
          (TRACK_TASK_WRAPPED=1 환경 설정)

track_task.sh 실행
  ├─► openclaw status 캡처 (before)
  ├─► 파일 메트릭 스냅샷
  ├─► run_*.sh 본체 실행
  ├─► exit code 기록
  ├─► openclaw status 캡처 (after)
  ├─► logs/task-runs.jsonl append
  └─► logs/token-usage.jsonl append (TRACK_TASK_CLAUDE_USAGE_FILE 수집)
```

task-id 패턴:

- morning-brief: `stock-investment:morning-brief`
- issue-analysis: `stock-investment:issue-report`
- daily-note: `stock-investment:daily-stock-note`

### 5-2. extract_claude_result.ts 호출

```
bun run _shared/lib/extract_claude_result.ts <claude.result.json> <output.md> [usage-file]
  └─► claude --output-format json envelope 파싱
        └─► report.md 추출 (또는 fallback 마크다운)
```

ai-nodes plan001에서 통합된 공용 추출기.
apartment, stock-investment, career-os 공통 사용.

### 5-3. Discord 알림

```
notify_discord.sh <메시지>
  └─► DISCORD_CHANNEL_ID (또는 DISCORD_WEBHOOK_URL) 확인
        └─► openclaw 경유 또는 직접 Discord 전송
```

SKIP_NOTIFY=1 로 로컬 테스트 시 억제 가능.

## 6. 직접 호출 진입점

cron 진입과 동일한 경로.

```bash
# morning-brief
bash stock-investment/skills/stock-investing-morning-brief/scripts/run_report.sh

# current-issue-analysis
bash stock-investment/skills/current-issue-analysis/scripts/run_issue_report.sh us-clarity-act
bash stock-investment/skills/current-issue-analysis/scripts/run_issue_report.sh ai-semiconductor-infrastructure
bash stock-investment/skills/current-issue-analysis/scripts/run_issue_report.sh google-io-alphabet-ai

# daily-stock-analysis-note
bash stock-investment/skills/daily-stock-analysis-note/scripts/run_daily_note.sh

# 종목 수동 지정
TICKER=NVDA bash stock-investment/skills/daily-stock-analysis-note/scripts/run_daily_note.sh

# 알림·발행 없이 로컬 테스트
SKIP_NOTIFY=1 SKIP_PUSH=1 bash stock-investment/skills/daily-stock-analysis-note/scripts/run_daily_note.sh
```

plan002 완료 후 native skill 진입점 추가 예정:

```bash
claude -p "/stock-investing-morning-brief"
claude -p "/current-issue-analysis <issue-key>"
claude -p "/daily-stock-analysis-note"
```
