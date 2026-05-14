# Phase 1 — docs-first: ADR-024 + 5문서 갱신

## 목표

본 plan011은 planning 세션에서 ADR 추가를 미뤘다(plan009가 adr.md를 동시에 만지고 있던 race 회피). 본 phase가 그 docs-first 작업을 처리. ADR-024 본문 + AGENTS.md ADR 카운트 + code-architecture.md 새 디렉터리 트리.

## 의존성 / 가정

- plan008 + plan009 + plan010 모두 `completed`.
- 따라서 adr.md에 ADR-007 단일화(plan009 phase-02) + ADR-023(옛 007b) + ADR-022(plan008)까지 정렬됨. 본 phase가 ADR-024 append.

## 작업

### 1. adr.md에 ADR-024 추가

다음 가용 번호 확인 후 append. ADR-024 본문은 planning skill 원칙 따라 짧게(5섹션·코드 명세 X·파일 전수 목록 X):

- **헤더**: `## ADR-024 — 모든 .sh runner TS(Bun) 마이그레이션 + 단일 진입점` + Status: Accepted + Date: 2026-05-14.
- **맥락**: plan004/008로 공용·도메인 헬퍼 TS화 완료, plan010으로 추상화·config 의존 강화. 그러나 14 runner의 .sh는 boilerplate(TASK_ROOT, set -euo pipefail, heredoc) 반복 + 비즈니스 로직 보유. 관심사 분리 필요(사용자 의도).
- **결정**: 모든 .sh runner를 TS로 마이그. 단일 진입점 `career-os/bin/run-now`(shebang Bun). dispatcher 책임은 `lib/dispatcher.ts`. runner는 plan006 컨벤션(`scripts/<skill>/<command>.ts`) 유지. `track_task.sh`도 TS로 마이그 + 모든 워크스페이스 caller 갱신(공용 자산이라 워크스페이스 격리 예외). 프롬프트는 `skills/<skill>/references/*-prompt.md` + `{{placeholder}}` 유지(build_prompt.ts와 연계, ADR-019).
- **거절한 대안**: 점진 마이그(부분 sh+ts 공존, drift 위험) / dispatcher만 TS(절반의 답) / shebang 없이 `bun run`만(호출자 부담).
- **결과**: TS-only career-os. boilerplate 반복 제거 + 타입 안전성 + import 일관성. .sh 0개(또는 wrapper 1개). 단점: Bun 의존 강화(plan004로 이미 수용). cross-workspace track_task 영향은 한 사이클에 일괄 처리.
- **적용**: phase 명세는 `tasks/plan011-runner-ts-migration/`. depends_on: ADR-020(plan004), ADR-022(plan008), ADR-019(plan006), plan010 결과(build_prompt.ts·study_pack_publish.ts·fos_study_git.ts).

### 2. AGENTS.md ADR 카운트 갱신

`career-os/AGENTS.md`의 ADR 카운트 라인: `ADR-001~023` → `ADR-001~024`.

루트 `AGENTS.md`(career-os 외부)도 별도 ADR 카운트가 있다면 갱신(현재는 카운트 X 표기).

### 3. code-architecture.md 디렉터리 트리 갱신

career-os 디렉터리 트리에 새 영역 추가:

- `career-os/bin/` — 단일 진입점(`run-now`, shebang TS).
- `career-os/lib/` — workspace-local 비즈니스 로직 TS(`dispatcher.ts`, 헬퍼).
- `career-os/scripts/<skill>/`는 그대로 유지. .sh가 .ts로 바뀐 결과 표기.

`scripts/command-router/` 폴더는 본 plan 후 비어지거나 제거 — 트리에서 빈 폴더로 표기 또는 삭제.

### 4. flow.md 변경 최소 — dispatcher 경로 1줄 갱신

`각 명령은 'run_now.sh <command>' → ...` 라인을 `'bin/run-now <command>' → 'lib/dispatcher.ts' → 'scripts/<skill>/<command>.ts' → ...`로.

추상화 + 일반 흐름 표기는 그대로(코드 명세 X 원칙).

### 5. prd.md / data-schema.md 변경 없음

진입점 경로 1줄(`scripts/command-router/run_now.sh` → `bin/run-now`)은 prd.md 기능 표 상단에 있다면 갱신. 데이터 스키마는 무관.

## 검증 명령

```bash
# 1. ADR-024 추가됨 + 정확한 위치 (맨 뒤)
grep -q '^## ADR-024 —' career-os/docs/adr.md
LAST=$(grep '^## ADR-' career-os/docs/adr.md | tail -1)
echo "$LAST" | grep -q 'ADR-024' || { echo "PHASE_FAILED: ADR-024 위치"; exit 1; }

# 2. AGENTS.md ADR 카운트 갱신
grep -q 'ADR-001~024' career-os/AGENTS.md

# 3. ADR-024 본문 줄 수 ≤30 (작성 원칙)
LINES=$(awk '/^## ADR-024 —/,EOF' career-os/docs/adr.md | wc -l)
[ "$LINES" -le 35 ] || { echo "PHASE_FAILED: ADR-024 비대 $LINES > 35"; exit 1; }

# 4. ADR-024에 코드 블록 없음
[ "$(awk '/^## ADR-024 —/,EOF' career-os/docs/adr.md | grep -c '```')" = "0" ]

# 5. code-architecture.md에 bin/ lib/ 항목 추가
grep -q 'bin/' career-os/docs/code-architecture.md
grep -q 'lib/' career-os/docs/code-architecture.md
```

검증 실패 시 `echo 'PHASE_FAILED: <식>' && exit 1`.

## 커밋

```
docs(career-os): plan011 ADR-024 + 5문서 갱신 (모든 .sh runner TS 마이그 결정)

- ADR-024 본문 (5섹션, 코드 명세 없이 의사결정만)
- AGENTS.md ADR 카운트 ADR-001~023 → ADR-001~024
- code-architecture.md 트리에 career-os/bin/ + lib/ 영역 추가
- flow.md 진입점 1줄 갱신 (bin/run-now → lib/dispatcher.ts)
```

## 범위 외

- 실제 bin/run-now + lib/dispatcher.ts 코드 신설 (phase-02).
- .sh runner TS 마이그 (phase-03~05).
- track_task.ts (phase-06).
