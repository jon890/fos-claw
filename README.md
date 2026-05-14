# ai-nodes 모노레포

재사용 가능한 작업 워크스페이스들의 단일 출처(source-of-truth) 모노레포. 각 워크스페이스는 자체 skills · config · data · logs를 가진 **독립 영역**이며, 공용 자산만 루트 `_shared/`와 `skills/`에 둔다.

## 워크스페이스

| 워크스페이스 | 목적 | 진입점 |
|---|---|---|
| [`apartment/`](apartment/) | 일일 아파트 시세 리포트 (현 타깃: LG원앙) | `apartment/skills/apartment-daily-report/scripts/run_report.sh` |
| [`career-os/`](career-os/) | 면접·커리어 준비 자동화 (학습·라이브 코딩·question bank·position 추천) | `career-os/scripts/command-router/run_now.sh <command>` |
| [`stock-investment/`](stock-investment/) | 일일 주식·암호화폐 모니터링 + 모닝 브리핑 | `stock-investment/skills/*/scripts/` (per AGENTS.md) |
| [`travel/`](travel/) | 여행별 일정·결정 로그 관리 (`trips/<trip-id>/` 분리) | 폴더 단위 운영 |

각 워크스페이스는 자체 `AGENTS.md` + `docs/`(또는 `WORKFLOW.md`)를 가진다. 워크스페이스 작업은 그 안의 `AGENTS.md`를 먼저 확인.

## 공용 자산

| 디렉터리 | 내용 |
|---|---|
| [`_shared/bin/`](_shared/bin/) | 셸·Python 공용 (`track_task.sh` 실행 트래커, `update_artifacts.py` artifacts upsert) |
| [`_shared/lib/`](_shared/lib/) | Bun TypeScript 공용 (`notify_discord.ts`, `invoke_claude_skills.ts`, `format_cost_summary.ts` — plan004/007 마이그레이션 결과) |
| [`_shared/types/`](_shared/types/) | 공용 TS 타입 (`ClaudeUsage` 등) |
| [`skills/`](skills/) | 저장소 전역 공용 Claude Code 스킬 (`agent-browser`, `planning`, `plan-and-build`, `workspace-audit`) |

## 아키텍처 원칙

- 영속 워크플로 로직은 `~/ai-nodes`에 둔다. `~/.openclaw/workspace`는 오케스트레이션 레이어이며, OpenClaw 측 wrapper는 thin glue로 유지.
- 모든 워크스페이스 실행은 `_shared/bin/track_task.sh`로 래핑 — `logs/task-runs.jsonl` + `logs/token-usage.jsonl`에 자동 기록.
- 워크스페이스 간 자산 교차 참조 금지. 공용은 `_shared/`와 루트 `skills/`만.
- 신규 결정은 워크스페이스의 `docs/adr.md` 또는 `docs/decisions/`에 누적.

## Git 정책

- 무시 대상: `.omc/`, `.claude/`, `**/data/`, `**/logs/`, `**/tmp/`, `*.result.json`.
- 중첩 저장소 주의: `career-os/sources/fos-study/`는 별도 동기 저장소(`github.com/jon890/fos-study`).
- 커밋 메시지: Conventional Commits 형식 + 한글 subject. `<type>(<scope>): <subject>`. 상세는 [`AGENTS.md`](AGENTS.md) 참조.

## 자세한 가이드

- 에이전트(Claude / Codex / Gemini)용 정식 가이드: [`AGENTS.md`](AGENTS.md) (CLAUDE.md는 본 파일의 심볼릭 링크).
- 워크스페이스별 진실 출처: 해당 `<workspace>/AGENTS.md`.
