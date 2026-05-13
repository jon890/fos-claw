# Phase 04 — _shared/lib/invoke_claude_skills.ts (claude_lib.sh + extract_claude_result.py 흡수)

**Model**: sonnet
**Status**: pending

---

## 목표

6+ runner 에 흩어진 Claude CLI 호출 + usage capture + 재시도 + 검증 패턴을 단일 TS 모듈로 흡수. `_shared/bin/claude_lib.sh` 의 `claude_persist_usage` + `_shared/bin/extract_claude_result.py` 의 마크다운 추출 + usage 파일 기록을 합쳐 한 곳에서 처리.

범위 외: caller 갱신 + 옛 파일 폐기 (phase-05), extractor·renderer·runner 본체 TS 화 (별도 plan).

## 관련 docs

- `career-os/docs/adr.md` ADR-014 (현재 토큰 회계 패턴), ADR-018 (TS 마이그레이션).
- `career-os/docs/flow.md` Claude 호출 + usage 전파 흐름.
- `_shared/types/index.ts` (`ClaudeUsage` 인터페이스).

## 기존 동등물 파악

### `_shared/bin/claude_lib.sh::claude_persist_usage`

```bash
claude_persist_usage <raw-claude-json-path>
# 동작: $TRACK_TASK_CLAUDE_USAGE_FILE env 설정돼 있으면 raw JSON 을 그 경로로 cp. 없으면 no-op.
```

caller 패턴 (6 runner): claude CLI 가 raw JSON 을 `$RAW_RESULT_JSON` 에 저장 → `claude_persist_usage "$RAW_RESULT_JSON"`.

### `_shared/bin/extract_claude_result.py`

```bash
python3 extract_claude_result.py <claude-json> <output-md> [usage-json]
# 동작: claude JSON 의 .result 를 마크다운으로 추출 + 선택적 usage 파일 기록.
```

caller 패턴 (baseline/daily/smoke 3 runner): claude CLI 결과 → 마크다운 + usage 파일 모두 한 호출에 처리.

## invoke_claude_skills.ts 작성

### API 설계

```typescript
// 옵션 1: shell-friendly CLI (기존 caller 가 인자 패턴만 바꿔 사용)
//   bun run _shared/lib/invoke_claude_skills.ts persist-usage <raw-json-path>
//   bun run _shared/lib/invoke_claude_skills.ts extract <raw-json> <output-md> [usage-json]
//
// 옵션 2: import 패턴 (TS runner 가 import 해서 함수 호출)
//   import { persistUsage, extractResult } from "@shared/lib/invoke_claude_skills.ts";
//
// 둘 다 지원 — 같은 함수에 CLI 진입점만 얹는다.
```

### 작성

```typescript
#!/usr/bin/env bun
// _shared/lib/invoke_claude_skills.ts
// Claude CLI 호출 + usage capture + 마크다운 추출. ADR-014 + ADR-018.
//
// 두 가지 사용 모드:
//   1. CLI: bun run invoke_claude_skills.ts <command> <args>
//      - persist-usage <raw-json-path>          (claude_lib.sh::claude_persist_usage 대체)
//      - extract <raw-json> <output-md> [usage] (extract_claude_result.py 대체)
//   2. Import: import { persistUsage, extractResult } from "@shared/lib/invoke_claude_skills.ts"

import { copyFileSync, existsSync, readFileSync, writeFileSync, statSync } from "node:fs";
import type { ClaudeUsage } from "../types/index.ts";

// ============================================================
// persistUsage — claude_lib.sh::claude_persist_usage 대체
// ============================================================

/**
 * raw Claude JSON envelope 을 $TRACK_TASK_CLAUDE_USAGE_FILE 경로로 cp.
 * env 미설정 또는 raw 파일 비어있으면 no-op (caller 실행 깨뜨리지 X).
 */
export function persistUsage(rawJsonPath: string): void {
  const target = process.env.TRACK_TASK_CLAUDE_USAGE_FILE;
  if (!target) return;
  if (!existsSync(rawJsonPath)) {
    console.error(`[invoke_claude_skills] persistUsage: raw 파일 없음: ${rawJsonPath}`);
    return;
  }
  try {
    if (statSync(rawJsonPath).size === 0) {
      console.error(`[invoke_claude_skills] persistUsage: raw 파일 비어있음: ${rawJsonPath}`);
      return;
    }
    copyFileSync(rawJsonPath, target);
  } catch (err) {
    console.error(
      `[invoke_claude_skills] persistUsage 실패: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

// ============================================================
// extractResult — extract_claude_result.py 대체
// ============================================================

/**
 * Claude `--output-format json` envelope 에서 `.result` 마크다운 추출 → output-md 에 저장.
 * 선택적으로 usage json 도 별도 파일에 기록.
 */
export function extractResult(rawJsonPath: string, outputMdPath: string, usageJsonPath?: string): void {
  if (!existsSync(rawJsonPath)) {
    throw new Error(`raw JSON 없음: ${rawJsonPath}`);
  }
  const raw = readFileSync(rawJsonPath, "utf-8").trim();
  if (!raw) {
    throw new Error(`raw JSON 비어있음: ${rawJsonPath}`);
  }

  let envelope: ClaudeUsage;
  try {
    envelope = JSON.parse(raw) as ClaudeUsage;
  } catch (err) {
    throw new Error(`raw JSON 파싱 실패: ${err instanceof Error ? err.message : String(err)}`);
  }

  const markdown = (envelope.result ?? "").trim();
  if (!markdown) {
    throw new Error(`envelope.result 비어있음 — Claude 출력이 마크다운을 안 줬을 가능성`);
  }

  writeFileSync(outputMdPath, markdown + "\n", "utf-8");

  if (usageJsonPath) {
    // raw 전체를 그대로 usage 파일에 (extract_claude_result.py 동일 동작).
    writeFileSync(usageJsonPath, raw, "utf-8");
  }
}

// ============================================================
// CLI 진입점
// ============================================================

if (import.meta.main) {
  const [, , cmd, ...args] = process.argv;
  switch (cmd) {
    case "persist-usage": {
      const [rawJsonPath] = args;
      if (!rawJsonPath) {
        console.error("usage: invoke_claude_skills.ts persist-usage <raw-json-path>");
        process.exit(1);
      }
      persistUsage(rawJsonPath);
      break;
    }
    case "extract": {
      const [rawJsonPath, outputMdPath, usageJsonPath] = args;
      if (!rawJsonPath || !outputMdPath) {
        console.error("usage: invoke_claude_skills.ts extract <raw-json> <output-md> [usage-json]");
        process.exit(1);
      }
      try {
        extractResult(rawJsonPath, outputMdPath, usageJsonPath || undefined);
      } catch (err) {
        console.error(`PHASE_FAILED: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
      break;
    }
    default:
      console.error("usage: invoke_claude_skills.ts <persist-usage|extract> <args>");
      process.exit(1);
  }
}
```

## 실행 권한 + shebang 검증

```bash
cd /home/bifos/ai-nodes
chmod +x _shared/lib/invoke_claude_skills.ts
head -1 _shared/lib/invoke_claude_skills.ts
# "#!/usr/bin/env bun"
```

## Unit smoke

```bash
cd /home/bifos/ai-nodes

# 1. CLI usage 메시지
bun run _shared/lib/invoke_claude_skills.ts 2>&1 | grep -q "usage:" || { echo "PHASE_FAILED: usage 메시지"; exit 1; }
bun run _shared/lib/invoke_claude_skills.ts persist-usage 2>&1 | grep -q "usage:" || { echo "PHASE_FAILED: persist-usage usage"; exit 1; }

# 2. persist-usage smoke — fake JSON + TRACK_TASK_CLAUDE_USAGE_FILE 으로 cp 확인
mkdir -p /tmp/plan004-phase04-smoke
echo '{"result": "fake markdown", "total_cost_usd": 0.05}' > /tmp/plan004-phase04-smoke/raw.json
TRACK_TASK_CLAUDE_USAGE_FILE=/tmp/plan004-phase04-smoke/usage.json \
  bun run _shared/lib/invoke_claude_skills.ts persist-usage /tmp/plan004-phase04-smoke/raw.json
diff /tmp/plan004-phase04-smoke/raw.json /tmp/plan004-phase04-smoke/usage.json || { echo "PHASE_FAILED: persist 결과 mismatch"; exit 1; }
echo "persist-usage smoke OK"

# 3. env 미설정 시 silent skip
TRACK_TASK_CLAUDE_USAGE_FILE="" \
  bun run _shared/lib/invoke_claude_skills.ts persist-usage /tmp/plan004-phase04-smoke/raw.json
# exit 0 이어야 (silent)
[ $? -eq 0 ] || { echo "PHASE_FAILED: silent skip"; exit 1; }

# 4. extract smoke
rm -f /tmp/plan004-phase04-smoke/{output.md,usage2.json}
bun run _shared/lib/invoke_claude_skills.ts extract \
  /tmp/plan004-phase04-smoke/raw.json \
  /tmp/plan004-phase04-smoke/output.md \
  /tmp/plan004-phase04-smoke/usage2.json
grep -q "fake markdown" /tmp/plan004-phase04-smoke/output.md || { echo "PHASE_FAILED: extract 마크다운"; exit 1; }
diff /tmp/plan004-phase04-smoke/raw.json /tmp/plan004-phase04-smoke/usage2.json || { echo "PHASE_FAILED: extract usage"; exit 1; }
echo "extract smoke OK"

# cleanup
rm -rf /tmp/plan004-phase04-smoke
```

## Critical Files

| 파일 | 변경 |
|---|---|
| `_shared/lib/invoke_claude_skills.ts` | 신규 |

옛 `claude_lib.sh`, `extract_claude_result.py` 는 phase-05 까지 보존.

## 검증

```bash
cd /home/bifos/ai-nodes

# 1. 파일 존재 + 실행 가능
[ -x _shared/lib/invoke_claude_skills.ts ] || { echo "PHASE_FAILED: invoke 실행 권한"; exit 1; }

# 2. tsc 통과
bunx tsc --noEmit
[ $? -eq 0 ] || { echo "PHASE_FAILED: tsc"; exit 1; }

# 3. 두 export 함수 존재
grep -q "export function persistUsage" _shared/lib/invoke_claude_skills.ts || { echo "PHASE_FAILED: persistUsage export"; exit 1; }
grep -q "export function extractResult" _shared/lib/invoke_claude_skills.ts || { echo "PHASE_FAILED: extractResult export"; exit 1; }

# 4. 위 unit smoke 전부 통과
```

## 커밋

```
feat(_shared/lib): invoke_claude_skills.ts (plan004 phase-04)

ADR-018. claude_lib.sh::claude_persist_usage + extract_claude_result.py 둘을 단일 TS 모듈로 흡수.

- persistUsage(raw-json-path): $TRACK_TASK_CLAUDE_USAGE_FILE 으로 cp. env 미설정·raw 비어있음 모두 silent skip.
- extractResult(raw-json, output-md, [usage-json]): claude envelope.result → 마크다운. 선택적 usage 별도 기록.
- CLI 진입점 (shell caller 용) + export (TS caller 용) 둘 다 지원.

caller 갱신 + 옛 .sh/.py 폐기는 phase-05.
```

push 는 phase-05.

## Blocked 조건

- 검증 1-4 실패 시 `PHASE_FAILED: <항목>`.
