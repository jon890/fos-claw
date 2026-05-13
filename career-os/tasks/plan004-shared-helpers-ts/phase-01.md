# Phase 01 — docs-first: ADR-018 + code-architecture _shared/ 트리 + AGENTS.md

**Model**: sonnet
**Status**: pending

---

## 목표

phase-02 부터의 모든 작업이 따를 TS 마이그레이션 정책과 디렉터리 구조 변경을 docs 에 먼저 박는다. 이 phase 는 docs 만 갱신하고 코드는 안 만진다.

범위 외: Bun 환경 설치·부트스트랩 (phase-02), 실제 TS 파일 작성 (phase-03/04), caller 갱신·옛 파일 폐기 (phase-05).

## 관련 docs (실행 전 읽기)

- `career-os/docs/adr.md` 끝부분. 본 phase 가 ADR-018 추가.
- `career-os/docs/code-architecture.md` _shared/ 디렉터리 트리 영역.
- `career-os/AGENTS.md` 외부 의존성 섹션.

## 작업 항목

### 1. adr.md 맨 아래에 ADR-018 추가

ADR 작성 원칙 (`skills/planning/SKILL.md`) 에 따라 5섹션만:

```markdown
---

## ADR-018 — 공용 헬퍼 TS(Bun) 마이그레이션: 점진 + _shared/lib·types 단일 위치

- Status: Accepted
- Date: 2026-05-13

### 맥락
ai-nodes 의 자동화 스크립트는 shell + Python 혼재 상태로 자랐다 (_shared/bin/ 의 claude_lib.sh / format_cost_summary.py / extract_claude_result.py / track_task.sh 와 워크스페이스별 notify_discord.sh, 그 외 30+ 파일). 사용자가 TS 코드는 한눈에 읽히지만 Python 은 어렵다는 점 + 공용 호출 래퍼가 6+ runner 에 흩어진 동일 패턴을 한 곳으로 모으면 drift 위험이 줄어든다는 점 두 가지를 만족시킬 마이그레이션이 필요.

### 결정
- 런타임은 Bun 단일 채택. shebang `#!/usr/bin/env bun` + `bun run script.ts` 둘 다 사용 가능. node_modules 만 ai-nodes 루트에 둠.
- TS 코드는 `_shared/lib/` 에, 공통 타입은 `_shared/types/` 에 둔다. 워크스페이스별 TS 복제 금지 — 공용은 단일 위치.
- 마이그레이션은 점진적. 본 plan(004)은 공용 헬퍼 3개만: notify_discord.ts / invoke_claude_skills.ts / format_cost_summary.ts. extractor·renderer·runner·dispatcher 는 별도 plan.
- 옛 헬퍼는 새 TS 가 등장하면 즉시 폐기. shim·thin wrapper 보존 금지. caller 가 일관 상태 — 한 사이클에 하나만 산다.

### 결과
- 자주 쓰이는 호출 패턴 (Claude CLI subprocess + usage capture + retry + Discord webhook + cost summary) 이 단일 TS 모듈로 일원화. 새 runner 추가 시 import 만 하면 됨.
- 사용자가 읽기 어려워하던 Python 헬퍼 1개가 사라짐 (format_cost_summary.py). claude_lib.sh 도 사라짐.
- node_modules 도입 → ai-nodes 루트의 디렉터리 무게 증가. 단점.
- 모든 caller 가 한꺼번에 갱신되어야 일관 상태 — 부분 마이그레이션 금지. plan004 phase-05 가 그 일관성을 강제.

### 적용
- 신규 TS 파일은 모두 `_shared/lib/` 또는 `_shared/types/` 에.
- 새 runner 가 Claude CLI 를 직접 호출하지 않는다 — `invoke_claude_skills.ts` 만 사용.
- 다음 plan(extractor·renderer TS 화) 은 본 ADR 정책 따라 진행.
```

### 2. code-architecture.md _shared/ 트리 갱신

기존 트리에 `_shared/bin/` 만 있으면 다음으로 교체 (이미 _shared/lib 가 있다면 lib 가 함께 등재된 형태):

```
├── _shared/                              ← 모든 워크스페이스 공용 코드 (ADR-018)
│   ├── bin/                              ← shell 계열. 점진 폐기 대상.
│   │   └── track_task.sh                 # 트래커 (당분간 shell 유지)
│   ├── lib/                              ← TS(Bun) 헬퍼. plan004 이후 추가.
│   │   ├── notify_discord.ts             # Discord webhook 알림
│   │   ├── invoke_claude_skills.ts       # Claude CLI 호출 + usage capture + retry
│   │   └── format_cost_summary.ts        # logs/task-runs.jsonl → 한 줄 cost 요약
│   └── types/                            ← TS 공통 타입.
│       └── (ClaudeUsage / TaskRunEntry / NotificationPayload 등)
```

`_shared/bin/` 안 폐기 대상 (`claude_lib.sh`, `format_cost_summary.py`, `extract_claude_result.py`) 은 트리에 등재하지 않는다 — phase-05 가 일괄 삭제하므로 docs 가 거짓이 되면 안 됨.

ai-nodes 루트의 `package.json` + `tsconfig.json` + 갱신된 `.gitignore` 도 디렉터리 한눈에 표에 등장.

### 3. AGENTS.md 외부 의존성 섹션 갱신

기존 "외부 의존성 — 모두 `~/ai-nodes/_shared/bin/` 아래" 항목을 갱신. 새 표:

```
- `_shared/bin/track_task.sh` — 모든 모드 트래커. 누락 시 모든 실행 실패.
- `_shared/lib/invoke_claude_skills.ts` — Bun. Claude CLI 호출 + usage 전파 + 재시도 + 검증 통합 헬퍼. claude_lib.sh + extract_claude_result.py 의 후속.
- `_shared/lib/notify_discord.ts` — Bun. Discord webhook 알림. 워크스페이스별 notify_discord.sh 의 후속.
- `_shared/lib/format_cost_summary.ts` — Bun. logs/task-runs.jsonl 최신 항목 → 한 줄 cost 요약. format_cost_summary.py 의 후속.
- `_shared/bin/update_artifacts.py` — `data/generated-artifacts.json` upsert (당분간 Python 유지, 별도 plan).
```

### 4. ADR 카운트 갱신

5문서 라우팅 표의 `ADR-001~017` (또는 그 카운트) → `ADR-001~018`.

## Critical Files

| 파일 | 변경 |
|---|---|
| `career-os/docs/adr.md` | ADR-018 추가 |
| `career-os/docs/code-architecture.md` | _shared/ 트리 갱신 |
| `career-os/AGENTS.md` | 외부 의존성 + ADR 카운트 갱신 |

다른 파일은 손대지 않는다. _shared/bin/ 안 옛 파일은 phase-05 가 일괄 삭제.

## 검증

```bash
cd /home/bifos/ai-nodes

# 1. ADR-018 추가
grep -c "^## ADR-018" career-os/docs/adr.md
# 기대: 1

# 2. ADR 헤더 총 18개 이상 (007 충돌 + ADR-001~018)
count=$(grep -c "^## ADR-" career-os/docs/adr.md)
[ "$count" -ge 18 ] || { echo "PHASE_FAILED: ADR 카운트 $count, expected 18+"; exit 1; }

# 3. code-architecture.md 에 _shared/lib + _shared/types 모두 등장
lib=$(grep -c "_shared/lib/" career-os/docs/code-architecture.md)
typ=$(grep -c "_shared/types/" career-os/docs/code-architecture.md)
[ "$lib" -ge 1 ] && [ "$typ" -ge 1 ] || { echo "PHASE_FAILED: code-architecture _shared/lib·types 누락"; exit 1; }

# 4. AGENTS.md 외부 의존성 섹션이 새 .ts 3개 모두 언급
for f in invoke_claude_skills notify_discord format_cost_summary; do
  grep -q "$f.ts" career-os/AGENTS.md || { echo "PHASE_FAILED: AGENTS.md $f.ts 누락"; exit 1; }
done

# 5. 코드 / 옛 헬퍼 파일은 손대지 않음
git diff --stat _shared/bin/ career-os/skills/ career-os/config/ | head
```

위 모두 통과해야 success.

## 커밋

```
docs(career-os, _shared): plan004 TS 마이그레이션 정책 ADR-018 + code-architecture _shared/lib·types 트리

phase-02 부터 따를 정책을 docs 먼저 박는다 (docs-first).

- adr.md ADR-018: 공용 헬퍼 TS(Bun) 마이그레이션. 단일 위치 _shared/lib + _shared/types. 점진적 + 옛 헬퍼는 즉시 폐기.
- code-architecture.md: _shared/ 트리에 lib/ + types/ 등재. 옛 폐기 대상 (claude_lib.sh, format_cost_summary.py, extract_claude_result.py) 은 트리에서 빼서 phase-05 와 시점 일치.
- AGENTS.md 외부 의존성 섹션 갱신 + ADR 카운트.

코드·옛 헬퍼 폐기는 phase-02~05.
```

push 는 phase-05.

## Blocked 조건

- 위 3 docs 누락 시 `PHASE_BLOCKED: docs 누락`.
- 검증 1-5 중 하나라도 실패 시 `PHASE_FAILED: 검증 N`.
