# Phase 6 — track_task.sh → track_task.ts + cross-workspace caller 일괄 갱신

## 목표

`_shared/bin/track_task.sh`(load-bearing 트래커, 모든 워크스페이스 의존)를 `_shared/bin/track_task.ts`로 마이그. career-os(이미 phase-02~05에서 dispatcher.ts에 연결) + apartment + stock-investment + travel의 모든 caller를 새 path로 일괄 갱신.

본 phase는 워크스페이스 격리 원칙의 예외 — `_shared/`는 공용이라 cross-workspace 변경 필요.

## 의존성 / 가정

- phase-05 완료. career-os 모든 runner TS.
- apartment / stock-investment / travel 워크스페이스 runner들이 `_shared/bin/track_task.sh`를 호출 중.
- working tree clean.

## 작업

### 1. `_shared/bin/track_task.ts` 신설

기존 .sh 동작 1:1 포팅:
- 실행 전후 `openclaw status` 캡처(subprocess).
- runner를 자식 프로세스로 실행(stdin/stdout/stderr 통과).
- 실행 후 logs/task-runs.jsonl + token-usage.jsonl append.
- 파일 메트릭 스냅샷(report.md / 입력 노트 / target 파일).
- usage JSON 파일을 `TRACK_TASK_CLAUDE_USAGE_FILE` env로 수집.

shebang `#!/usr/bin/env bun`. 단독 실행 + import 가능.

### 2. cross-workspace caller 일괄 갱신

caller 위치 스캔:

```bash
grep -rln '_shared/bin/track_task' apartment/ career-os/ stock-investment/ travel/ \
  --include='*.sh' --include='*.ts' --include='*.py' 2>/dev/null
```

각 caller에서 `track_task.sh` → `track_task.ts`로 치환. shebang 직접 실행이라 호출 인터페이스는 동일.

apartment의 `TRACK_TASK_WRAPPED` 자가 래핑 패턴은 새 .ts에서도 동일 동작 — env 변수 검사 로직 그대로.

### 3. 옛 `_shared/bin/track_task.sh` 처리

본 phase에서 `git rm`. 호환성 wrapper 보존 X(사용자 directive — shim 금지).

### 4. .gitignore / OpenClaw wrapper 점검

`~/.openclaw/workspace/` wrapper들이 옛 .sh 경로를 직접 호출하면 깨짐. 그러나 OpenClaw 영역은 사용자가 직접 처리(읽기 전용 보호 원칙). 본 phase 본문에 사용자 경고 한 줄 남김 — phase 실행 Claude가 stdout으로 안내.

## 검증 명령

```bash
# 1. 새 track_task.ts 존재 + shebang
test -f _shared/bin/track_task.ts
test -x _shared/bin/track_task.ts
head -1 _shared/bin/track_task.ts | grep -q '#!/usr/bin/env bun'
bun --no-install build --target=bun _shared/bin/track_task.ts --outdir=/tmp/plan011 >/dev/null 2>&1

# 2. 옛 .sh 제거됨
[ -z "$(git ls-files _shared/bin/track_task.sh)" ]

# 3. cross-workspace에 옛 track_task.sh 호출 0 (history 보존 영역 제외)
HITS=$(grep -rln 'track_task\.sh' apartment/ career-os/ stock-investment/ travel/ _shared/ \
  --include='*.sh' --include='*.ts' --include='*.py' 2>/dev/null \
  | grep -v 'tasks/' | grep -v 'docs/')
[ -z "$HITS" ] || { echo "PHASE_FAILED: track_task.sh 호출 잔재"; echo "$HITS"; exit 1; }

# 4. apartment의 자가 래핑 (TRACK_TASK_WRAPPED) 동작 보존
grep -q 'TRACK_TASK_WRAPPED\|track_task.ts' apartment/skills/apartment-daily-report/scripts/run_report.sh

# 5. career-os dispatcher.ts가 새 track_task.ts 호출
grep -q 'track_task\.ts' career-os/lib/dispatcher.ts

# 6. 사용자 경고 (openclaw wrapper 수동 갱신 필요)
echo "[INFO] ~/.openclaw/workspace/ wrapper는 사용자가 직접 갱신 (읽기 전용 영역). track_task.sh → track_task.ts 경로 변경 필요." >&2
```

검증 실패 시 `echo 'PHASE_FAILED: <식>' && exit 1`.

## 커밋

```
feat(_shared): track_task.sh → track_task.ts 마이그 + cross-workspace caller 일괄 갱신

- _shared/bin/track_task.ts 신설 (shebang Bun)
- apartment / career-os / stock-investment / travel caller path 갱신
- 옛 track_task.sh git rm
- ~/.openclaw/workspace/ wrapper는 사용자가 직접 갱신 (보호 영역)
```

## 범위 외

- 통합 smoke(phase-07).
- OpenClaw wrapper 갱신(사용자 영역, 읽기 전용).
