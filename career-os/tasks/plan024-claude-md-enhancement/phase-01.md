# Phase 01 — career-os/AGENTS.md /init 식 보강

**Model**: sonnet
**Status**: pending

---

## 목표

career-os/AGENTS.md (= CLAUDE.md 심링크, 현재 132줄)에 4 영역 보강:

1. 5문서 라우팅 가이드 다음에 workspace-structure.md 링크 + 의도된 비대칭 (ADR-019) 명시
2. 워크플로 진입점 섹션을 *7 native skill code block 형태*로 재정리 (현재 한 줄에 모든 명령 — 읽기 어려움)
3. plan 사이클 안내 (planning → plan-and-build) 한 줄 추가
4. 외부 의존성 섹션에 Bun runtime + claude CLI 명시

**범위 외**: 본문 재구성 (현 구조 보존), workspace-structure.md 자체 작성 (apartment plan001 phase-03 책임), career-os 5문서 갱신.

---

## 본 phase 강제 주의문

- 반드시 Edit 도구로 career-os/AGENTS.md를 갱신해야 한다. prose 응답만으로는 PHASE_FAILED (common-pitfalls 6-6).
- 작성·수정하는 모든 문서에 section sigil (section mark, U+00A7) 특수문자 사용 금지. 섹션 헤더는 `## 1. 제목` 형태.
- 본 phase 종료 시 commit 개수 self-check = 1.
- 사전 조건: `docs/workspace-structure.md` 존재 (cwd=ai-nodes 루트 기준, apartment plan001 phase-03 완료 후). 부재 시 PHASE_BLOCKED + exit 2.

---

## 사전 조건 검증

run-phases.py는 cwd=career-os로 phase 시작 (run-phases.py line 355). 본 phase는 ai-nodes 루트 path를 다수 인용하므로 첫 bash 블록에서 cwd=ai-nodes 루트로 변경. Claude Code Bash 도구는 동일 phase 안 cwd 보존이라 첫 호출에만 cd 명시 + 후속 자동 ai-nodes 루트.

```bash
# cwd를 ai-nodes 루트로 변경 (run-phases.py cwd=career-os 우회). 이후 모든 bash 명령은 ai-nodes 루트 기준.
cd "$(git rev-parse --show-toplevel)"
pwd  # 기대: /home/bifos/ai-nodes

# 사전 조건: apartment plan001 phase-03 산출 (docs/workspace-structure.md, cwd=ai-nodes 루트 기준)
test -f docs/workspace-structure.md || { echo "PHASE_BLOCKED: docs/workspace-structure.md 부재. apartment plan001 phase-03 완료 후 재시도"; exit 2; }
echo "[사전 조건] OK — docs/workspace-structure.md 존재"
```

---

## 관련 docs

- 갱신 대상: `career-os/AGENTS.md` (현재 132줄, 5문서 라우팅 + 목적 + MVP 타깃 + 후보자 포커스 + 진실 출처 + 워크플로 진입점 + 외부 의존성 + 운영 원칙 + 규칙 + 본 섹션 다수)
- 참조: `apartment/AGENTS.md` (apartment plan001 phase-02 slim, 모범 사례)
- 참조: `docs/workspace-structure.md` (워크스페이스 표준 청사진)
- 참조: `docs/adr.md` ADR-004 (워크스페이스 표준 정식화)

---

## 작업 항목

### 1. 5문서 라우팅 가이드 다음에 workspace-structure 링크 추가

career-os/AGENTS.md line 17 `tasks/는 docs와 별개의 영역으로...` 단락 다음에 신규 단락 추가:

`Edit` 도구로:

old_string (line 17 단락 전체):
```
`tasks/`는 docs와 별개의 영역으로, `skills/planning`이 생성하고 `skills/plan-and-build`가 실행하는 **워크스페이스 단위 실행 계획**의 영구 저장소다. `<workspace>/tasks/plan{N}-<slug>/` 형태로 각 plan이 자기 디렉터리를 갖고, 그 안에 `index.json` + `phase-NN.md`가 들어간다. 완료된 plan도 history 보존 목적으로 삭제하지 않는다.
```

new_string:
```
`tasks/`는 docs와 별개의 영역으로, `skills/planning`이 생성하고 `skills/plan-and-build`가 실행하는 **워크스페이스 단위 실행 계획**의 영구 저장소다. `<workspace>/tasks/plan{N}-<slug>/` 형태로 각 plan이 자기 디렉터리를 갖고, 그 안에 `index.json` + `phase-NN.md`가 들어간다. 완료된 plan도 history 보존 목적으로 삭제하지 않는다.

워크스페이스 표준 구조는 [`../docs/workspace-structure.md`](../docs/workspace-structure.md) (ai-nodes ADR-004) 청사진을 따른다. career-os는 ADR-019 (`scripts/` 분리)의 의도된 비대칭 예외 — 다른 워크스페이스로 확산 의도 없음.

plan 진행 cycle: `skills/planning` (8단계 + task 파일 작성) → `skills/plan-and-build` (별도 세션에서 phase 자동 실행 + critic 검증). 세션 격리 원칙 — planning은 task 생성·commit·push까지, 실 phase 실행은 별도 세션.
```

### 2. 워크플로 진입점 (요약) 섹션 재정리 — 7 native skill code block 형태

`## 워크플로 진입점 (요약)` 섹션 본문 (line 46~56 추정) 갱신.

`Edit` 도구로:

먼저 정확한 본문 확인:

```bash
grep -n "워크플로 진입점\|native skill 진입점 7개\|^## " career-os/AGENTS.md | head -15
sed -n '46,60p' career-os/AGENTS.md
```

기존 본문에서 한 줄에 7 native skill 모두 명시한 부분을 *code block 형태*로 분리. old_string은 `native skill 진입점 7개 (ai-nodes ADR-002, plan013~022): ... \`claude -p "/position-recommender ...` (활성 공고 수집 + ...).` 단락 전체.

new_string (code block 형태):

```
## 워크플로 진입점 (요약)

**dispatcher 폐기 완료 (plan023, ADR-031)** — native skill 진입점 7개로 단일화. `claude -p "/<skill-name> <args>"` 직접 호출이 표준 진입점.

이력: 옛 진입점은 `skills/cj-oliveyoung-java-backend-prep/scripts/run_now.sh` → ADR-017에서 `skills/command-router/scripts/run_now.sh` → ADR-019 (plan006 후)에서 `scripts/command-router/run_now.sh` 순으로 변화. plan013~022에서 모든 dispatcher case가 native skill 또는 폐기 처리됨. plan023에서 command-router 디렉터리 자체 폐기.

### native skill 7개 (ai-nodes ADR-002 + plan013~023)

```bash
cd career-os

# 학습·면접 자산 생성 (fos-study commit + push)
claude -p "/study-pack-writer <topic>"                     # 주제 중심 학습 문서
claude -p "/interview-asset-writer <topic>"                # 후보자 이력 Q&A 은행 + 마스터 플레이북

# 추천·분석 (비공개 career-os 리포트)
claude -p "/study-topic-recommender [context]"             # 아침 토픽 추천 + replenish + live-coding seed (ADR-026)
claude -p "/interview-prep-analyzer [baseline|daily|topic]"  # baseline 전체 / daily 집중 자연어 분기 (ADR-027)
claude --permission-mode acceptEdits -p "/candidate-baseline-suggester"  # 후보자 자산 Append 갱신 (ADR-028)
claude -p "/interview-coffeechat-prep"                     # 커피챗 기업 사이트 수집 + 전략 리포트 (ADR-029)
claude -p "/position-recommender [컨텍스트] [채용공고 file]"  # 활성 공고 수집 + 3 티어 추천 (ADR-030)
```

각 명령의 입력/산출물/git push 여부 상세는 `docs/prd.md` 기능 표, 데이터 흐름은 `docs/flow.md` 참조.

런타임 상태(어떤 명령이 최근에 잘 도는지)는 이 문서에 박지 않는다 — `logs/task-runs.jsonl`이 단일 출처이고 `skills/workspace-audit`가 그때그때 보고한다.
```

(기존 본문의 *이력* 단락과 *상세 컨벤션 결정 이력* 참조 + *런타임 상태* 단락은 보존. 한 줄 native skill 7개 명시 부분만 code block으로 재정리.)

### 3. 외부 의존성 섹션에 Bun runtime + claude CLI 명시

`## 외부 의존성` 섹션 본문 확인:

```bash
grep -n "외부 의존성\|_shared/lib\|_shared/bin\|Bun\|claude CLI" career-os/AGENTS.md | head -15
```

기존 외부 의존성 섹션은 `_shared/lib/notify_discord.ts`, `_shared/lib/mvp_target_schema.ts`, `_shared/bin/extract_claude_result.py`, `_shared/bin/update_artifacts.py`, `_shared/bin/track_task.sh` 4-5 항목. Bun runtime / claude CLI 자체 항목 부재.

`Edit` 도구로 외부 의존성 섹션 끝에 추가 (마지막 불릿 다음 줄에 새 불릿):

old_string (외부 의존성 섹션 마지막 줄, 정확한 본문은 grep으로 확인):
```
- `_shared/bin/update_artifacts.py` — `data/generated-artifacts.json` upsert (당분간 Python 유지, 별도 plan).
```

new_string:
```
- `_shared/bin/update_artifacts.py` — `data/generated-artifacts.json` upsert (당분간 Python 유지, 별도 plan).
- Bun runtime — TS 헬퍼 실행. 설치 후 ai-nodes 루트에서 `bun install` 1회 (zod, fast-xml-parser, dotenv).
- `claude` CLI — native skill 호출 (`claude -p "/<skill>"`). 인증 + 로그인 필요. ai-nodes 모노레포 공통.
```

(정확한 마지막 불릿이 다른 경우 — `Edit`의 old_string을 grep 결과 정확 본문으로 조정.)

### 4. commit 생성

```bash
git add career-os/AGENTS.md
git commit -m "$(cat <<'EOF'
docs(career-os): AGENTS.md /init 식 보강 — 7 native skill code block + workspace-structure 링크 + plan-and-build cycle + Bun/claude CLI 외부 의존성 (plan024 phase-01)

- 5문서 라우팅 다음에 ai-nodes ADR-004 workspace-structure.md 링크 + ADR-019 비대칭 예외 명시
- plan-and-build cycle 한 줄 안내 (planning → plan-and-build, 세션 격리)
- 워크플로 진입점 7 native skill 한 줄 → code block 형태 (가독성)
- 외부 의존성 끝에 Bun runtime (`bun install`) + claude CLI 명시

기존 132줄 보존 + 부족 영역만 보강 (apartment AGENTS.md slim 수준 최소 침습).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## 검증 (phase 종료 직전)

```bash
SIGIL_CHAR=$(printf '\xc2\xa7')

# 1. workspace-structure.md 링크 존재
grep -q "workspace-structure.md" career-os/AGENTS.md || { echo "PHASE_FAILED: workspace-structure.md 링크 누락"; exit 1; }
echo "[workspace-structure 링크] OK"

# 2. ADR-019 비대칭 예외 명시
grep -q "ADR-019" career-os/AGENTS.md || { echo "PHASE_FAILED: ADR-019 비대칭 명시 누락"; exit 1; }
echo "[ADR-019 비대칭] OK"

# 3. plan-and-build cycle 안내
grep -q "plan-and-build" career-os/AGENTS.md || { echo "PHASE_FAILED: plan-and-build 안내 누락"; exit 1; }
echo "[plan-and-build cycle] OK"

# 4. 워크플로 진입점 code block 형태 (claude -p code block 안에 7개)
SKILL_COUNT=$(grep -c "^claude.*-p.*\"/" career-os/AGENTS.md || echo 0)
echo "[native skill code block] $SKILL_COUNT lines"
[ "$SKILL_COUNT" -ge 7 ] || { echo "PHASE_FAILED: native skill code block 부족 ($SKILL_COUNT < 7)"; exit 1; }

# 5. Bun runtime + claude CLI 명시
grep -q "Bun runtime\|bun install" career-os/AGENTS.md || { echo "PHASE_FAILED: Bun runtime 명시 누락"; exit 1; }
grep -q "\`claude\` CLI\|claude.*CLI" career-os/AGENTS.md || { echo "PHASE_FAILED: claude CLI 명시 누락"; exit 1; }
echo "[Bun + claude CLI] OK"

# 6. section sigil 미사용
COUNT=$(grep -c "$SIGIL_CHAR" career-os/AGENTS.md || echo 0)
[ "$COUNT" -eq 0 ] || { echo "PHASE_FAILED: AGENTS.md sigil 잔재 $COUNT"; exit 1; }
echo "[sigil check] 0건"

# 7. 분량 (기존 132 + 보강 ~30-50줄 = 160-180 추정)
LINES=$(wc -l < career-os/AGENTS.md)
echo "[AGENTS.md] $LINES lines"
[ "$LINES" -ge 140 ] && [ "$LINES" -le 220 ] || { echo "PHASE_FAILED: AGENTS.md $LINES 범위 (140-220) 밖"; exit 1; }

# 8. commit 개수 self-check
COMMITS=$(git log --format='%H' HEAD~1..HEAD | wc -l)
echo "[commit count] $COMMITS"
[ "$COMMITS" -eq 1 ] || { echo "PHASE_FAILED: phase commit $COMMITS != 1"; exit 1; }

# 9. working tree clean
DIRTY=$(git status --porcelain career-os/AGENTS.md | wc -l)
echo "[career-os/AGENTS.md dirty] $DIRTY lines"
[ "$DIRTY" -eq 0 ] || { echo "PHASE_FAILED: working tree dirty"; exit 1; }

echo "✓ Phase 01 검증 통과"
```

---

## 의도 메모

- 큰 재구성 아님 — 132줄 보존 + 4 위치 보강. apartment AGENTS.md slim 수준 최소 침습.
- workspace-structure.md 링크 = apartment plan001 phase-03 산출 의존. plan001 미완료 시 PHASE_BLOCKED.
- 워크플로 진입점 code block = 가독성 강화. 기존 한 줄 7 명령 → 7 줄 code block.
- Bun / claude CLI는 *모든 워크스페이스 공통* 의존이지만 career-os AGENTS.md에서는 그동안 *암묵적 가정*이었음. 명시화로 새 사용자 onboarding 용이.
- 외부 의존성 섹션 boundary — `_shared/bin`, `_shared/lib` 모듈 + 외부 환경 (Bun, claude CLI, agent-browser) 모두 포함.
