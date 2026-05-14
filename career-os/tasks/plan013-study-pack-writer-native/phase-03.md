# Phase 3 — scripts/study-pack-writer 폐기 + dispatcher case 제거 + 의존 caller 정리

**Model**: sonnet
**Status**: pending

---

## 목표

phase-02에서 native skill SKILL.md를 새로 작성했으므로, 옛 외부 subprocess 진입점인 `career-os/scripts/study-pack-writer/`를 폐기. `command-router/run_now.sh`의 `study-pack` case 제거. 다른 skill이 호출하던 study-pack 관련 헬퍼 caller 정리.

**범위 외**: 11개 다른 skill 마이그 (후속 plan), 정적 검증·push (phase-04). 본 phase는 study-pack-writer 한정 *코드 폐기 + 호출 정리*.

## 관련 docs (실행 전 필수 읽기)

- `docs/adr.md` ai-nodes ADR-002 — 옛 외부 subprocess shell runner 폐기 결정.
- phase-02 commit — 새 SKILL.md가 동작 책임 인수.

## 사전 검증

```bash
cd /home/bifos/ai-nodes

# 1-A. 새 SKILL.md 존재
test -f career-os/.claude/skills/study-pack-writer/SKILL.md \
  || { echo "PHASE_BLOCKED: phase-02 미완 — 새 SKILL.md 없음"; exit 2; }

# 1-B. 옛 scripts/study-pack-writer/ 존재 (폐기 대상)
test -d career-os/scripts/study-pack-writer \
  || { echo "PHASE_BLOCKED: 옛 scripts/study-pack-writer 이미 없음 — 부분 실행 의심"; exit 2; }

# 1-C. dispatcher run_now.sh 존재
test -f career-os/scripts/command-router/run_now.sh \
  || { echo "PHASE_BLOCKED: dispatcher run_now.sh 없음"; exit 2; }

echo "사전 검증 OK"
```

## 작업 항목

### 1. 옛 scripts/study-pack-writer/ 일괄 삭제

```bash
cd /home/bifos/ai-nodes

echo "=== 폐기 대상 파일 ==="
ls -1 career-os/scripts/study-pack-writer/

# git rm 일괄 (디렉터리 통째)
git rm -r career-os/scripts/study-pack-writer/

# 폐기 후 검증
[ ! -d career-os/scripts/study-pack-writer ] \
  || { echo "PHASE_FAILED: 디렉터리 잔존"; exit 1; }
echo "scripts/study-pack-writer/ 폐기 OK"
```

### 2. command-router/run_now.sh study-pack case 제거

Read로 `career-os/scripts/command-router/run_now.sh` 현재 본문 확인. `study-pack)` case 블록 찾기:

```bash
cd /home/bifos/ai-nodes
echo "=== study-pack case 위치 ==="
grep -n "study-pack)" career-os/scripts/command-router/run_now.sh
```

Edit으로 case 블록 전체 제거. 다른 case는 그대로 유지. Usage 메시지에서 `study-pack` 항목도 제거.

검증:
```bash
cd /home/bifos/ai-nodes

# study-pack case 0건
grep -c "^\s*study-pack)" career-os/scripts/command-router/run_now.sh | \
  grep -q "^0$" \
  || { echo "PHASE_FAILED: study-pack case 잔존"; exit 1; }

# bash syntax
bash -n career-os/scripts/command-router/run_now.sh \
  || { echo "PHASE_FAILED: dispatcher bash syntax"; exit 1; }

# 옛 진입점 호출은 native skill 진입점으로 대체됨 — 명시
echo "dispatcher study-pack case 제거 OK"
```

### 3. 의존 caller 정리

study-pack-writer 폐기로 영향받는 외부 caller가 있는지 확인:

```bash
cd /home/bifos/ai-nodes

echo "=== study-pack-writer 디렉터리 참조 위치 (코드+현행 docs) ==="
grep -rln "scripts/study-pack-writer\|skills/study-pack-writer" \
  career-os/scripts/ career-os/AGENTS.md career-os/docs/code-architecture.md \
  career-os/docs/flow.md career-os/docs/prd.md 2>/dev/null | head -20
```

발견되는 참조 처리:
- **코드(scripts/, _shared/)**: Edit으로 갱신 또는 폐기
- **5문서 (code-architecture / flow / prd)**: native skill 안내로 갱신 — "study-pack은 `claude -p \"/study-pack <topic>\"`로 직접 호출 (ai-nodes ADR-002)"
- **AGENTS.md**: 이미 phase-01에서 갱신됐을 것 — grep 결과 확인 후 추가 갱신
- **ADR / task 본문**: history 보존, 변경 금지

특별 케이스: `career-os/scripts/_lib/study_pack_publish.ts`. plan010-2 phase-03에서 5개 caller가 호출 중. 그 중 study-pack-writer caller는 폐기됐고 *남은 caller 4개*(maintainer / from_request / live_coding_dispatch / bootcamp_batch)는 그대로 옛 패턴 유지. study_pack_publish.ts 자체는 폐기 X (다른 4 caller가 사용 중) — 후속 plan에서 점진 폐기.

`career-os/scripts/_lib/study_pack_publish.ts`가 더 이상 호출되지 않으면 폐기 가능하나 본 phase 범위 외.

### 4. flow.md 갱신

`career-os/docs/flow.md`에서 study-pack 흐름 섹션 native skill 패턴으로:

```
### `study-pack <topic>` (외부 publish)

native skill (ai-nodes ADR-002, plan013): `claude -p "/study-pack <topic>"` → SKILL.md 자동 로드 → Claude가 도구로 직접 처리.

상세 동작: `career-os/.claude/skills/study-pack-writer/SKILL.md` Workflow 섹션 참조.

이전 외부 subprocess 흐름 (dispatcher → run_study_pack.sh → claude --print → extractor → publish)은 plan013에서 폐기됨.
```

기존 study-pack 섹션을 위처럼 간소화. *상세 동작은 SKILL.md가 단일 출처*이므로 flow.md는 진입점만.

## Critical Files

| 파일·디렉터리 | 변경 |
|---|---|
| `career-os/scripts/study-pack-writer/` (디렉터리 통째) | `git rm -r` |
| `career-os/scripts/command-router/run_now.sh` | `study-pack)` case 제거 + usage 메시지 |
| `career-os/docs/flow.md` | study-pack 섹션 native skill 패턴으로 |
| (코드 안 외부 참조) | 발견 시 Edit으로 갱신 |

`career-os/scripts/_lib/study_pack_publish.ts`는 *유지* (다른 4 caller 사용 중). `_lib/` 폐기는 후속 plan.

## 커밋

```bash
cd /home/bifos/ai-nodes
git add career-os/scripts/study-pack-writer/ career-os/scripts/command-router/run_now.sh career-os/docs/flow.md
git commit -m "refactor(career-os): scripts/study-pack-writer 폐기 + dispatcher study-pack case 제거 (plan013 phase-03)

ai-nodes ADR-002 적용. phase-02의 native SKILL.md가 동작 책임 인수 — 옛
외부 subprocess 진입점 폐기.

- git rm -r career-os/scripts/study-pack-writer/ (전체 폐기)
- command-router/run_now.sh: study-pack case 블록 + usage 메시지 제거
- flow.md: study-pack 흐름을 native skill 진입점 안내로 간소화 — 상세는
  SKILL.md 단일 출처
- 외부 코드 참조 grep + 갱신 (발견 시)

scripts/_lib/study_pack_publish.ts는 다른 4 caller(maintainer / from_request
/ live_coding_dispatch / bootcamp_batch)가 아직 사용 중이라 유지. 그 caller
들 native 마이그는 후속 plan."
```

push는 phase-04.

## 검증

```bash
cd /home/bifos/ai-nodes

# 1. scripts/study-pack-writer 폐기
[ ! -d career-os/scripts/study-pack-writer ] \
  || { echo "PHASE_FAILED: 디렉터리 잔존"; exit 1; }
echo "[1] scripts/study-pack-writer/ 폐기 OK"

# 2. dispatcher case 0건
HITS=$(grep -E "^\s*study-pack\)" career-os/scripts/command-router/run_now.sh | wc -l)
[ "$HITS" = "0" ] || { echo "PHASE_FAILED: dispatcher case 잔존"; exit 1; }
echo "[2] dispatcher case 제거 OK"

# 3. dispatcher bash syntax
bash -n career-os/scripts/command-router/run_now.sh \
  || { echo "PHASE_FAILED: dispatcher syntax"; exit 1; }
echo "[3] dispatcher bash syntax OK"

# 4. 코드 안 옛 경로 참조 잔재 0건 (history 제외)
HITS=$(grep -rln "scripts/study-pack-writer" career-os/scripts/ _shared/ 2>/dev/null | wc -l)
[ "$HITS" = "0" ] || { echo "PHASE_FAILED: 옛 scripts/study-pack-writer 참조"; exit 1; }
echo "[4] 옛 scripts 참조 0 OK"

# 5. flow.md에 native skill 안내
grep -q "native skill\|ADR-002\|claude -p" career-os/docs/flow.md \
  || { echo "PHASE_FAILED: flow.md native skill 안내 누락"; exit 1; }
echo "[5] flow.md 갱신 OK"

echo "phase-03 검증 통과"
```

## Blocked 조건

**중요 — exit code 명시**: 본문의 모든 검증 bash 블록은 반드시 Bash 도구로 직접 실행.

- 새 SKILL.md 부재 → `PHASE_BLOCKED: phase-02 미완` + `exit 2`
- 옛 scripts 부재 (이미 폐기됨) → `PHASE_BLOCKED: 부분 실행 의심` + `exit 2`
- 검증 1~5 중 하나 실패 → `PHASE_FAILED: <항목>` + `exit 1`

## 의도 메모

- 옛 외부 subprocess 진입점(`scripts/study-pack-writer/run_study_pack.sh` 등)이 폐기됨으로써 native skill 단일 진입점만 살아 있음.
- 다른 11 skill의 옛 진입점(dispatcher case + scripts/<name>/)은 그대로 유지 — 본 phase 범위 외.
- _shared/lib/study_pack_publish.ts는 다른 4 caller가 옛 패턴 그대로 사용 중이라 유지. 점진 마이그라 일관성은 study-pack-writer 한 skill 안에서만.
