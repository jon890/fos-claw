# Phase 3 — 가벼운 4 runner TS 마이그 (smoke / baseline / daily / recommend-positions)

## 목표

자기-완결적이고 도메인 단순한 4개 .sh runner를 .ts로 마이그. dispatcher.ts(phase-02)가 이들을 case별로 호출하도록 연결.

대상:
- `scripts/knowledge-gap-analyzer/run_smoke_test.sh` → `run_smoke_test.ts`
- `scripts/knowledge-gap-analyzer/run_baseline.sh` → `run_baseline.ts`
- `scripts/knowledge-gap-analyzer/run_daily.sh` → `run_daily.ts`
- `scripts/position-recommender/run_position_recommendation.sh` → `run_position_recommendation.ts`

## 의존성 / 가정

- phase-02 완료. dispatcher.ts 존재.
- plan010 phase-02 결과(`_shared/lib/build_prompt.ts`) 활성 — TS runner들이 프롬프트 조립에 사용.
- plan008 결과 — `_shared/lib/extract_claude_result.ts` 사용 가능.
- working tree clean.

## 작업

### 1. 4개 .ts runner 신설

각 runner는 자기 .sh의 비즈니스 로직을 1:1 포팅. boilerplate 제거:

- `TASK_ROOT` 같은 env 변수는 `_shared/lib/workspace.ts`(또는 lib/dispatcher.ts에서 한 번)에서 import.
- `set -euo pipefail`은 TS의 try/catch + 명시적 throw로.
- heredoc 프롬프트는 `skills/<skill>/references/<command>-prompt.md` 분리(plan010 phase-02 결과 의존) + `build_prompt.ts` 호출.
- Claude 호출은 `invoke_claude_skills.ts` 사용(plan004 ADR-020).
- extractor 호출은 `_shared/lib/extract_claude_result.ts` 사용(plan008 phase-01 결과).

각 runner 인터페이스: default export 함수 + shebang `#!/usr/bin/env bun`(단독 실행 가능).

### 2. dispatcher.ts case 연결

phase-02에서 placeholder로 둔 4 case를 새 .ts runner의 dynamic import 또는 spawn으로 연결:

- `smoke` → `scripts/knowledge-gap-analyzer/run_smoke_test.ts`
- `baseline` → `scripts/knowledge-gap-analyzer/run_baseline.ts`
- `daily` → `scripts/knowledge-gap-analyzer/run_daily.ts`
- `recommend-positions` → `scripts/position-recommender/run_position_recommendation.ts`

### 3. 옛 .sh git rm

```bash
git rm career-os/scripts/knowledge-gap-analyzer/run_smoke_test.sh
git rm career-os/scripts/knowledge-gap-analyzer/run_baseline.sh
git rm career-os/scripts/knowledge-gap-analyzer/run_daily.sh
git rm career-os/scripts/position-recommender/run_position_recommendation.sh
```

## 검증 명령

```bash
# 1. 4 .ts runner 존재 + shebang + 실행 권한
for f in career-os/scripts/knowledge-gap-analyzer/run_smoke_test.ts \
         career-os/scripts/knowledge-gap-analyzer/run_baseline.ts \
         career-os/scripts/knowledge-gap-analyzer/run_daily.ts \
         career-os/scripts/position-recommender/run_position_recommendation.ts; do
  test -f "$f" || { echo "PHASE_FAILED: $f 없음"; exit 1; }
  test -x "$f" || { echo "PHASE_FAILED: $f 실행 권한"; exit 1; }
  head -1 "$f" | grep -q '#!/usr/bin/env bun' || { echo "PHASE_FAILED: $f shebang"; exit 1; }
  bun --no-install build --target=bun "$f" --outdir=/tmp/plan011 >/dev/null 2>&1 \
    || { echo "PHASE_FAILED: $f syntax"; exit 1; }
done

# 2. 옛 .sh 제거됨
for f in career-os/scripts/knowledge-gap-analyzer/run_smoke_test.sh \
         career-os/scripts/knowledge-gap-analyzer/run_baseline.sh \
         career-os/scripts/knowledge-gap-analyzer/run_daily.sh \
         career-os/scripts/position-recommender/run_position_recommendation.sh; do
  [ -z "$(git ls-files "$f")" ] || { echo "PHASE_FAILED: $f git 잔재"; exit 1; }
done

# 3. dispatcher.ts에서 새 .ts 경로 인식
grep -q 'run_smoke_test.ts' career-os/lib/dispatcher.ts
grep -q 'run_baseline.ts' career-os/lib/dispatcher.ts
grep -q 'run_daily.ts' career-os/lib/dispatcher.ts
grep -q 'run_position_recommendation.ts' career-os/lib/dispatcher.ts

# 4. boilerplate 제거 확인 — 새 .ts에 TASK_ROOT 직접 선언 없음 (import해서 사용)
for f in career-os/scripts/knowledge-gap-analyzer/run_*.ts \
         career-os/scripts/position-recommender/run_position_recommendation.ts; do
  [ "$(grep -c 'process.env.TASK_ROOT\|getenv' "$f")" -le 1 ] \
    || { echo "PHASE_FAILED: $f env 변수 반복"; exit 1; }
done

# 5. smoke 실행 — 새 경로
career-os/bin/run-now smoke
```

검증 실패 시 `echo 'PHASE_FAILED: <식>' && exit 1`.

## 커밋

```
refactor(career-os): 가벼운 4 runner TS 마이그 (smoke/baseline/daily/recommend-positions)

- 4 .sh → .ts (shebang Bun, 실행 권한)
- boilerplate 제거: TASK_ROOT 등은 import로
- heredoc 프롬프트는 references/*-prompt.md로 분리 + build_prompt.ts 호출
- dispatcher.ts에 4 case 연결
- 옛 .sh git rm
```

## 범위 외

- 나머지 10 runner(phase-04, 05).
- track_task.ts(phase-06).
