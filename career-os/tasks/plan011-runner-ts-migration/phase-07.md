# Phase 7 — 통합 smoke + .sh 잔재 grep + push + trailing cleanup

## 목표

phase-01~06 통과 후 career-os 전역에 .sh 잔재 0(또는 thin wrapper 1개) 확인 + 14 dispatcher case 동작 + Bun-only 워크스페이스 정합성. 옛 `scripts/command-router/run_now.sh` thin wrapper 운명 결정 + 옛 폴더 cleanup.

## 의존성 / 가정

- phase-01~06 모두 `completed`.
- working tree clean.

## 작업

### 1. career-os .sh 잔재 grep

```bash
HITS=$(find career-os/scripts career-os/bin career-os/lib -name '*.sh' 2>/dev/null \
  | grep -v 'tasks/' | grep -v 'docs/')
echo "남은 .sh: $HITS"

# thin wrapper 1개(run_now.sh) 외에 모두 0이어야
COUNT=$(echo "$HITS" | grep -c '.' || true)
[ "$COUNT" -le 1 ] || { echo "PHASE_FAILED: .sh 잔재 다수 ($COUNT)"; exit 1; }
```

### 2. 옛 `scripts/command-router/run_now.sh` 처리

phase-02에서 thin wrapper(5 lines)로 축소된 옛 .sh의 운명:

- 옵션 A: 그대로 유지 — 옛 caller(openclaw wrapper 등) 호환성.
- 옵션 B: git rm — 사용자 directive "shim 금지" 일관성. 단 옛 caller가 깨질 수 있어 사용자 영역(.openclaw) 갱신 필수.

기본 결정: **A(유지)** — `~/.openclaw/workspace/` 보호 영역이 옛 path를 가리킬 수 있으므로 한 사이클 동안 thin wrapper 보존. 다음 plan(plan012-shim-cleanup)에서 사용자가 openclaw wrapper 갱신 확인 후 본 thin wrapper도 제거.

본 phase 본문에 결정 명시. phase 실행 Claude가 stdout으로 보고.

### 3. Bun 의존성 가시화

career-os 안의 모든 진입 실행 파일이 `#!/usr/bin/env bun` 사용 — `bun` 명령 누락 시 모든 워크플로 실패. `package.json` 또는 `README.md`에 Bun 의존 명시(루트 AGENTS.md는 이미 명시).

### 4. dispatcher 14 case 통합 smoke

```bash
career-os/bin/run-now smoke
career-os/bin/run-now 2>&1 | grep -qE 'usage|Usage'
```

`smoke`는 새 `run_smoke_test.ts`(phase-03)를 호출. 동작 확인.

다른 13 case는 외부 의존(Claude API, fos-study git push)이라 본 phase에서 실행 안 함 — dispatcher 인식 여부만 grep으로 확인.

### 5. flow.md / code-architecture.md 일관성

phase-01에서 갱신한 docs와 실제 구조 일치 확인:
- `career-os/bin/run-now` 실재.
- `career-os/lib/dispatcher.ts` 실재.
- `career-os/scripts/<skill>/<command>.ts` 14개 모두 실재.

### 6. push + trailing cleanup

```bash
git add career-os/ _shared/
git commit -m "chore(career-os, _shared): plan011 통합 smoke 통과 + .sh → .ts 마이그 완료"
git push origin main

if [ -n "$(git status --porcelain career-os/tasks/plan011-runner-ts-migration/index.json)" ]; then
  git add career-os/tasks/plan011-runner-ts-migration/index.json
  git commit -m "chore(career-os): plan011 index.json commitSha 후기록"
  git push origin main
fi
```

## 검증 명령 (요약)

```bash
# career-os 안의 .sh ≤ 1 (thin wrapper만)
[ "$(find career-os/scripts career-os/bin career-os/lib -name '*.sh' 2>/dev/null | wc -l)" -le 1 ]

# 14 dispatcher case 모두 존재
for cmd in baseline daily smoke recommend-positions recommend-topics replenish-topics \
           study-pack maintain-study-pack question-bank master foodville-coffeechat \
           bootcamp-batch live-coding-dispatch auto-question-bank; do
  grep -q "$cmd" career-os/lib/dispatcher.ts || { echo "PHASE_FAILED: dispatcher.ts에 $cmd 누락"; exit 1; }
done

# 새 진입점 동작
career-os/bin/run-now smoke

# git log
git log -1 --pretty=%s | grep -q 'plan011.*통합 smoke\|plan011 index.json commitSha'
```

검증 실패 시 `echo 'PHASE_FAILED: <식>' && exit 1`.

## 커밋

phase-07은 두 커밋(2번째 옵션):
1. `chore(career-os, _shared): plan011 통합 smoke 통과 + .sh → .ts 마이그 완료`
2. `chore(career-os): plan011 index.json commitSha 후기록`

## 범위 외

- 옛 `scripts/command-router/run_now.sh` thin wrapper 최종 제거(plan012, openclaw wrapper 갱신 확인 후).
- apartment / stock-investment / travel의 runner TS 마이그(별도 결정 — 워크스페이스 격리).
- Python 잔재 8개(`collect_*.py`, `build_target_file_list.py` 등) TS 마이그(별도 plan).
