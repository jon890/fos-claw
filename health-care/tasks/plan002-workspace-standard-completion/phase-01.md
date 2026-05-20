# Phase 1 — workflow.md → flow.md (5문서 명명 정합)

health-care plan002 phase-01. `docs/workflow.md`를 표준 `docs/flow.md`로 명명 정정 + 참조 갱신.

## 작업 위치 (cwd 정책)

run-phases.py가 `cwd=health-care/`로 실행. 첫 bash 블록:

```bash
cd "$(git rev-parse --show-toplevel)"
```

## 관련 docs

- `ai-nodes/docs/workspace-structure.md` 4번 — 5문서 컨벤션 (1=prd, 2=data-schema, **3=flow.md**, 4=code-architecture, 5=adr).
- `health-care/AGENTS.md` L10 — workflow.md 참조.
- `health-care/docs/workflow.md` — 이름 변경 대상 (본문 보존).

## 변경할 파일

이동 (git mv):
- `health-care/docs/workflow.md` → `health-care/docs/flow.md`

수정 (Edit — workflow.md 참조 갱신):
- `health-care/AGENTS.md`
- `health-care/docs/prd.md` / `data-schema.md` / `code-architecture.md` / `adr.md` (참조 있을 시)

## 명세

### 1. git mv

```bash
cd "$(git rev-parse --show-toplevel)"
git mv health-care/docs/workflow.md health-care/docs/flow.md
```

### 2. AGENTS.md L10 갱신

옛:
```
- `docs/workflow.md` — intake, tracking, clinic prep, skill flow
```

새:
```
- `docs/flow.md` — intake, tracking, clinic prep, skill flow
```

### 3. 다른 docs 참조 grep + 일괄 정정

```bash
cd "$(git rev-parse --show-toplevel)"
grep -l "workflow\.md\|workflow.md" health-care/docs/*.md health-care/AGENTS.md 2>&1
```

발견 시 각 파일에서 `workflow.md` → `flow.md` Edit. 단 *본문 내용*에 "workflow"가 *일반 단어*로 등장하는 건 보존.

## 성공 기준

```bash
cd "$(git rev-parse --show-toplevel)"

# 1. flow.md 존재
test -f health-care/docs/flow.md
echo "[flow.md 존재] OK"

# 2. workflow.md 부재
test ! -f health-care/docs/workflow.md
echo "[workflow.md 부재] OK"

# 3. AGENTS.md / docs *.md 안 workflow.md 참조 0
! grep -rn "workflow\.md" health-care/AGENTS.md health-care/docs/*.md
echo "[참조 0] OK"

# 4. flow.md 본문 보존 (라인 수)
LINES=$(wc -l < health-care/docs/flow.md)
test "$LINES" -ge 30 || (echo "FAIL: flow.md $LINES 라인 — 본문 손실" && exit 1)
echo "[본문 보존] OK"
```

## 금지 사항

- 본문 내용 변경 (이름 변경만).
- 다른 5문서 / skill / data / config 수정.
- ADR 신설.
- amend / force push.

## commit

```bash
cd "$(git rev-parse --show-toplevel)"
git add health-care/AGENTS.md health-care/docs/

git commit -m "docs(health-care): workflow.md → flow.md (5문서 명명 정합, plan002 phase-01)

- git mv docs/workflow.md → docs/flow.md
- AGENTS.md L10 + 다른 docs 참조 갱신
- 본문 변경 0 (이름만)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

push 없음 (phase-04 책임).

## PHASE_BLOCKED / PHASE_FAILED

- workflow.md 부재 (sanity 점검) — `PHASE_BLOCKED: 파일 부재`.
- flow.md 본문 손실 — `PHASE_FAILED: 본문 누락`.
- 의도 외 staged 파일 — `PHASE_BLOCKED: cross-session stage race`.
