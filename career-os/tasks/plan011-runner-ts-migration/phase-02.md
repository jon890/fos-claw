# Phase 2 — career-os/bin/run-now + lib/dispatcher.ts 신설

## 목표

career-os 단일 진입점 `bin/run-now`(shebang `#!/usr/bin/env bun`) + 비즈니스 dispatcher `lib/dispatcher.ts` 신설. 옛 `scripts/command-router/run_now.sh`는 본 phase에서 thin wrapper로 축소(직접 bin/run-now exec) 또는 그대로 유지(점진 전환). 새 진입점이 동작 가능해야 하지만 14 case 모두는 phase-03~05에서 .ts runner 신설 후 연결.

## 의존성 / 가정

- phase-01 완료. ADR-024 + docs 반영.
- working tree clean.

## 작업

### 1. `career-os/bin/run-now` 신설

shebang `#!/usr/bin/env bun`. 단순 entry:

- 인자 파싱: `<command> [args...]`.
- `lib/dispatcher.ts`의 `dispatch(command, args)` 함수 호출.
- exit code 전파.

길이 ≤ 30 lines. 비즈니스 로직 ❌.

실행 권한 부여(`chmod +x`).

### 2. `career-os/lib/dispatcher.ts` 신설

dispatcher 책임:

- 14 case switch / map.
- 각 case는 해당 skill의 `scripts/<skill>/<command>.ts`를 dynamic import 또는 subprocess로 호출.
- `_shared/bin/track_task.sh`(또는 phase-06 후 `.ts`) 래핑.
- 실패 시 비-0 exit + stderr.
- usage 메시지(스킬·명령 목록).

본 phase에서는 14 case 중 phase-03~05가 다룰 runner들은 *옛 .sh runner를 그대로 exec* 하는 임시 통로 유지. 점진 전환.

옵션 — 어느 쪽이든:
- (a) dispatcher가 case마다 `await import('career-os/scripts/<skill>/<command>.ts')` 후 default export 호출.
- (b) dispatcher가 case마다 `Bun.spawn(['bun', 'scripts/<skill>/<command>.ts', ...])`.

(a)가 import 통합·타입 안전성 우수. 단 dynamic import 경로 처리 주의(workspace root 기준 path resolution).

### 3. 옛 `scripts/command-router/run_now.sh`를 thin wrapper로

본 phase에서 옛 dispatcher .sh 파일을 다음 형태로 축소:

```
#!/usr/bin/env bash
set -euo pipefail
TASK_ROOT="${TASK_ROOT:-$HOME/ai-nodes/career-os}"
exec "$TASK_ROOT/bin/run-now" "$@"
```

≤ 5 lines. openclaw wrapper 등 옛 caller가 본 .sh 경로를 호출하는 호환성 유지(읽기 전용 영역). phase-07에서 옛 .sh 제거 결정 — 우선 thin wrapper 유지.

### 4. _shared/lib/<공용>.ts 의존성 확인

dispatcher.ts와 bin/run-now는 다음을 import 또는 호출:
- `_shared/lib/notify_discord.ts`(ADR-021).
- `_shared/lib/invoke_claude_skills.ts`(ADR-020) — 단 dispatcher 자체는 Claude 호출 안 함. runner들이 사용.
- `_shared/lib/format_cost_summary.ts` — 본 phase의 알림 부착 헬퍼.

import 경로는 workspace root 기준(`../../_shared/lib/notify_discord.ts` 또는 절대 경로).

## 검증 명령

```bash
# 1. 새 진입점 + dispatcher 존재
test -f career-os/bin/run-now
test -x career-os/bin/run-now
head -1 career-os/bin/run-now | grep -q '#!/usr/bin/env bun'
test -f career-os/lib/dispatcher.ts

# 2. bun syntax 통과
bun --no-install build --target=bun career-os/bin/run-now --outdir=/tmp/plan011 >/dev/null 2>&1
bun --no-install build --target=bun career-os/lib/dispatcher.ts --outdir=/tmp/plan011 >/dev/null 2>&1

# 3. 옛 run_now.sh가 thin wrapper로 (≤10 lines)
L=$(wc -l < career-os/scripts/command-router/run_now.sh)
[ "$L" -le 10 ] || { echo "PHASE_FAILED: run_now.sh $L lines > 10 (thin wrapper 위반)"; exit 1; }
grep -q 'bin/run-now' career-os/scripts/command-router/run_now.sh

# 4. dispatcher.ts가 14 command 모두 인식 (case 또는 map)
for cmd in baseline daily smoke recommend-positions recommend-topics replenish-topics \
           study-pack maintain-study-pack question-bank master foodville-coffeechat \
           bootcamp-batch live-coding-dispatch auto-question-bank; do
  grep -qE "['\"]$cmd['\"]" career-os/lib/dispatcher.ts \
    || { echo "PHASE_FAILED: dispatcher.ts에 $cmd 누락"; exit 1; }
done

# 5. 새 진입점 직접 실행 — usage 출력
career-os/bin/run-now 2>&1 | grep -qE 'usage|Usage' \
  || { echo "PHASE_FAILED: usage 메시지 없음"; exit 1; }

# 6. smoke 1회 실행 (smoke runner는 phase-03에서 마이그 예정이라 옛 .sh로 fallthrough — 본 phase에서는 dispatcher가 그것을 호출 가능해야)
bash career-os/scripts/command-router/run_now.sh smoke || true  # smoke 자체 실패 OK, dispatcher 자체 동작 확인
```

검증 실패 시 `echo 'PHASE_FAILED: <식>' && exit 1`.

## 커밋

```
feat(career-os): bin/run-now + lib/dispatcher.ts 신설 (14 case 라우팅)

- career-os/bin/run-now: shebang Bun, 단일 진입점 (≤30 lines)
- career-os/lib/dispatcher.ts: 14 command 라우팅 + track_task 래핑
- 옛 scripts/command-router/run_now.sh를 thin wrapper로 축소 (5 lines)
- 14 runner의 실제 TS 마이그는 phase-03~05
```

## 범위 외

- 14 runner의 TS 신설(phase-03~05).
- track_task.ts(phase-06).
- 옛 .sh runner 제거(phase-07).
