# Phase 03 — _shared/lib/notify_discord.ts + format_cost_summary.ts

**Model**: sonnet
**Status**: pending

---

## 목표

작고 격리된 2 헬퍼를 먼저 TS 로 작성. 각자 unit smoke 가능 + 옛 동등물 (`format_cost_summary.py`, 워크스페이스별 `notify_discord.sh`) 과 동일 동작.

범위 외: `invoke_claude_skills.ts` (phase-04), caller 갱신 + 옛 파일 폐기 (phase-05).

## 관련 docs

- `career-os/docs/adr.md` ADR-018 (phase-01 결정).
- `_shared/types/index.ts` (phase-02 산출물 — `TaskRunEntry`, `NotificationPayload` 사용).

## 1. notify_discord.ts

### 동등 동작 기준

현재 워크스페이스별 `notify_discord.sh` 가 하는 일:

- `$DISCORD_WEBHOOK_URL` env 읽음 (`<workspace>/config/.env` 에 정의).
- 인자 1개 (메시지 문자열) 를 받아 webhook POST.
- webhook URL 없으면 silent skip (실행 자체 깨뜨리지 X).
- network 에러도 비치명적.

`_shared/lib/notify_discord.ts` 도 같은 계약.

### 작성

```typescript
#!/usr/bin/env bun
// _shared/lib/notify_discord.ts
// Discord webhook 알림. ADR-018.
// Usage:
//   bun run _shared/lib/notify_discord.ts "메시지"
//   또는 from-import: await notifyDiscord("메시지")

import type { NotificationPayload } from "../types/index.ts";

const DEFAULT_USERNAME = "ai-nodes";
const TIMEOUT_MS = 10_000;

export async function notifyDiscord(content: string, opts?: { username?: string }): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) {
    // webhook 없음 — silent. 워크스페이스 격리 원칙.
    return;
  }

  const payload: NotificationPayload = {
    content,
    username: opts?.username ?? DEFAULT_USERNAME,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      // 비치명적 — phase 진행 막지 X.
      console.error(`[notify_discord] webhook returned ${res.status}`);
    }
  } catch (err) {
    console.error(`[notify_discord] failed: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timeout);
  }
}

// CLI 진입점 — bash 에서 직접 호출용.
if (import.meta.main) {
  const message = process.argv[2];
  if (!message) {
    console.error("usage: notify_discord.ts <message>");
    process.exit(1);
  }
  await notifyDiscord(message);
}
```

## 2. format_cost_summary.ts

### 동등 동작 기준

`_shared/bin/format_cost_summary.py` 가 하는 일:

- 2개 인자: `<workspace-root>` `<task-name>`.
- `<workspace>/logs/task-runs.jsonl` 마지막 줄 (또는 task-name 매칭 최신 entry) 읽음.
- 비용·모델·duration → 한 줄 요약 stdout 출력.
- 데이터 없으면 빈 문자열 stdout (caller 가 그대로 메시지에 합쳐도 안 깨짐).

### 작성

```typescript
#!/usr/bin/env bun
// _shared/lib/format_cost_summary.ts
// logs/task-runs.jsonl 최신 entry → 한 줄 cost 요약. ADR-018.
// Usage:
//   bun run _shared/lib/format_cost_summary.ts <workspace-root> <task-name>

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { TaskRunEntry } from "../types/index.ts";

function shortModel(model: string | null): string {
  if (!model) return "";
  // "claude-opus-4-7[1m]" → "opus-4-7[1m]"
  return model.replace(/^claude-/, "");
}

function shortDuration(sec: number | null): string {
  if (!sec || sec <= 0) return "";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}m${s}s` : `${m}m`;
}

function shortCost(usd: number | null): string {
  if (usd === null || usd === undefined) return "";
  return `\$${usd.toFixed(4)}`;
}

function shortTokens(input: number | null, output: number | null): string {
  if (input == null && output == null) return "";
  const fmt = (n: number | null) => {
    if (n == null) return "?";
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  };
  return `${fmt(input)}→${fmt(output)} 토큰`;
}

export function formatCostSummary(workspaceRoot: string, taskName: string): string {
  const logPath = join(workspaceRoot, "logs", "task-runs.jsonl");
  let lines: string[];
  try {
    lines = readFileSync(logPath, "utf-8").trimEnd().split("\n");
  } catch {
    return "";
  }

  // task-name 일치하는 최신 entry 부터 역순 탐색.
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    let entry: TaskRunEntry;
    try {
      entry = JSON.parse(line) as TaskRunEntry;
    } catch {
      continue;
    }
    if (entry.task_name !== taskName) continue;

    const parts = [
      shortCost(entry.cost_usd),
      shortModel(entry.model),
      shortTokens(entry.tokens_in_delta, entry.tokens_out_delta),
      shortDuration(entry.duration_sec),
    ].filter(Boolean);

    if (parts.length === 0) return "";
    return " · " + parts.join(" · ");
  }

  return "";
}

// CLI 진입점
if (import.meta.main) {
  const workspaceRoot = process.argv[2];
  const taskName = process.argv[3];
  if (!workspaceRoot || !taskName) {
    console.error("usage: format_cost_summary.ts <workspace-root> <task-name>");
    process.exit(1);
  }
  const out = formatCostSummary(workspaceRoot, taskName);
  if (out) process.stdout.write(out);
}
```

`format_cost_summary.py` 의 출력 형식 (`" · $0.2715 · sonnet-4-6 · 24k→6k 토큰 · 105s"`) 과 정확히 동일.

## 3. 실행 권한 + shebang 검증

```bash
cd /home/bifos/ai-nodes
chmod +x _shared/lib/notify_discord.ts _shared/lib/format_cost_summary.ts

# shebang 라인 확인
head -1 _shared/lib/notify_discord.ts
head -1 _shared/lib/format_cost_summary.ts
# 둘 다 "#!/usr/bin/env bun" 이어야
```

## 4. Unit smoke

```bash
cd /home/bifos/ai-nodes

# notify_discord — webhook 없는 환경에서 silent skip 확인
DISCORD_WEBHOOK_URL="" bun run _shared/lib/notify_discord.ts "smoke test"
# stdout 비어있고 exit 0 이어야 (silent skip)
[ $? -eq 0 ] || { echo "PHASE_FAILED: notify silent skip 실패"; exit 1; }

# format_cost_summary — career-os 의 가장 최근 task 한 줄로 동작 확인
# logs/task-runs.jsonl 에 어떤 task_name 이 있는지 먼저 확인
LATEST_TASK=$(tail -5 career-os/logs/task-runs.jsonl 2>/dev/null | tail -1 | python3 -c "import json,sys; print(json.loads(sys.stdin.read())['task_name'])" 2>/dev/null)
if [ -n "$LATEST_TASK" ]; then
  out=$(bun run _shared/lib/format_cost_summary.ts career-os "$LATEST_TASK")
  echo "format smoke: '$out'"
  # 정확한 비교는 안 함 (포맷만 비어있지 않으면 OK — 또는 모든 필드 null 이면 빈 문자열)
else
  echo "(logs/task-runs.jsonl 비어있음 — smoke 스킵)"
fi
```

## Critical Files

| 파일 | 변경 |
|---|---|
| `_shared/lib/notify_discord.ts` | 신규 |
| `_shared/lib/format_cost_summary.ts` | 신규 |

옛 파일 (`format_cost_summary.py`, 워크스페이스별 `notify_discord.sh`) 은 phase-05 까지 보존.

## 검증

```bash
cd /home/bifos/ai-nodes

# 1. 두 .ts 파일 존재 + 실행 가능
[ -x _shared/lib/notify_discord.ts ] || { echo "PHASE_FAILED: notify 실행 권한"; exit 1; }
[ -x _shared/lib/format_cost_summary.ts ] || { echo "PHASE_FAILED: cost 실행 권한"; exit 1; }

# 2. tsc 통과
bunx tsc --noEmit
[ $? -eq 0 ] || { echo "PHASE_FAILED: tsc"; exit 1; }

# 3. CLI 호출 시 usage 안내 / silent skip 정상
bun run _shared/lib/notify_discord.ts 2>&1 | grep -q "usage:"
bun run _shared/lib/format_cost_summary.ts 2>&1 | grep -q "usage:"
```

## 커밋

```
feat(_shared/lib): notify_discord.ts + format_cost_summary.ts (plan004 phase-03)

ADR-018. 워크스페이스별 notify_discord.sh 와 _shared/bin/format_cost_summary.py 의 후속.

- notify_discord.ts: DISCORD_WEBHOOK_URL 없으면 silent skip, network 에러도 비치명적. 워크스페이스 격리 원칙 (각 워크스페이스의 config/.env).
- format_cost_summary.ts: logs/task-runs.jsonl 최신 entry → 한 줄 cost 요약. .py 출력 형식과 정확히 동일.

caller 갱신 + 옛 파일 폐기는 phase-05.
```

push 는 phase-05.

## Blocked 조건

- 검증 1-3 실패 시 `PHASE_FAILED: <항목>`.
