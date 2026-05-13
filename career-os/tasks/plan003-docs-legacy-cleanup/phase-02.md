# Phase 02 — legacy cleanup: decisions/ 15 + audit/ 3 + learn/ 7 일괄 git rm + 잔존 참조 갱신

**Model**: sonnet
**Status**: pending

---

## 목표

ADR-018 (`docs/adr.md` 맨 아래, phase-01 산출물) 의 폐기 결정에 따라 legacy 디렉터리·파일을 일괄 삭제하고, 그 파일들을 가리키던 잔존 참조를 갱신한다.

범위 외: `docs/learn/008-docs-audit-quality-loop.md` (fos-study PR 후 별도 plan), `docs/hand-off/` 파일 자체 삭제 (해당 파일은 내용 가치 있으므로 보존하되 본문 안의 옛 참조만 갱신), `docs/prep/` (면접 종료 후 별도).

## 관련 docs (실행 전 읽기)

- `career-os/docs/adr.md` 맨 아래 ADR-018 (phase-01 산출물). decisions/ + audit/ 폐기 + learn 흡수 흐름 명문화.
- `career-os/docs/learn/README.md` (phase-01 재작성본). 학습 정책 가이드.

## 작업 항목

### 1. docs/decisions/ 15 파일 일괄 git rm

15 파일은 다음 패턴으로 모두 `docs/decisions/NNN-*.md`:

```bash
cd /home/bifos/ai-nodes

# 사전 확인 — 정확히 15 파일이어야
ls -1 career-os/docs/decisions/[0-9]*.md | wc -l
# 기대값: 15

# git rm
git rm career-os/docs/decisions/[0-9]*.md
```

15 파일은 다음과 같다 (phase 작성 시점 실측):

- 001-daily-file-selection-strategy.md
- 002-study-progress-tracking.md
- 003-baseline-chunking-removal.md
- 004-reports-directory-convention.md
- 005-study-pack-publishing-policy.md
- 006-study-pack-entrypoint-and-routing.md
- 007-experience-question-bank-workflow.md
- 007-study-pack-stdout-capture.md
- 008-generation-status-notifications.md
- 009-morning-topic-reservoir-and-recommendation-pipeline.md
- 010-recommendation-scoring-and-mix-targets.md
- 011-automatic-topic-replenishment.md
- 012-broad-daily-curation-3-3-3-1.md
- 013-secondary-rss-discovery-layer.md
- 014-restore-claude-usage-with-stdout-capture.md

이 14개 ADR의 본문은 `docs/adr.md` 단일 출처에 모두 통합되어 있다. 잔존 history 는 git log 로 추적 가능.

빈 디렉터리 정리:

```bash
rmdir career-os/docs/decisions 2>/dev/null
```

### 2. docs/audit/ 3 파일 일괄 git rm

3 파일은 모두 4/21 ~ 4/22 일회성 audit 산출물:

```bash
cd /home/bifos/ai-nodes
ls -1 career-os/docs/audit/*.md | wc -l
# 기대값: 3

git rm career-os/docs/audit/*.md
rmdir career-os/docs/audit 2>/dev/null
```

ADR-018 의 정책상 audit 산출물은 docs 트리에 영구 보존하지 않는다. workspace-audit 이 만들 미래 산출물은 `/tmp/workspace-audit-<ws>/` 세션 한정 (ADR-015 정책).

### 3. docs/learn/{001~007}.md 7 파일 git rm

008 은 보존 (fos-study PR 별도 plan):

```bash
cd /home/bifos/ai-nodes

# 사전 확인 — 7 파일이어야 (008 제외)
ls -1 career-os/docs/learn/[0-9]*.md | grep -v "008-" | wc -l
# 기대값: 7

# git rm (008 명시적 제외)
git rm career-os/docs/learn/001-discord-notification-routing.md \
       career-os/docs/learn/002-fos-study-git-sequencing.md \
       career-os/docs/learn/003-agent-skill-direction-for-study-pack.md \
       career-os/docs/learn/004-fos-openclaw-and-fos-study-split.md \
       career-os/docs/learn/005-next-step-for-fos-openclaw-source-of-truth.md \
       career-os/docs/learn/006-fos-openclaw-target-tree.md \
       career-os/docs/learn/007-today-status-and-settled-directions.md
```

각 파일의 결정·근거는 다음 위치로 이미 흡수됨:

- 001 → ADR-008 + `docs/flow.md` notify 흐름
- 002 → ADR-005 (fos-study commit/push 정책)
- 003 → ADR-006 + `skills/fos-study-pack` 스킬 자체
- 004 ~ 006 → 현재 ai-nodes 구조 (sources/fos-study 양방향 모델) 자체에 실현
- 007 → 5문서가 현행 상태의 단일 출처라 정적 스냅샷 불요
- 008 → 보존 (별도 plan)

### 4. 잔존 참조 갱신

phase 작성 시점 grep 결과 — `docs/decisions/` 또는 옛 learn 파일명을 직접 가리키는 참조:

```bash
cd /home/bifos/ai-nodes

# 옛 docs/decisions/ 경로를 가리키는 곳
grep -rln "docs/decisions/" career-os/ --include='*.md' --include='*.sh' --include='*.py' 2>/dev/null \
  | grep -v "sources/fos-study"
# 기대 (cleanup 전): AGENTS.md, docs/adr.md, docs/hand-off/<file>.md, docs/learn/006... (006은 위에서 삭제됨)
```

각 잔존 참조 대응:

1. `career-os/AGENTS.md` — phase-01 이 ADR 카운트 갱신했지만 본문 안에 `docs/decisions/` 디렉터리 자체를 prose 로 언급할 가능성. ADR-018 폐기 결정에 맞춰 해당 prose 를 삭제 또는 `docs/adr.md` 단일 출처로 짧게 교체.

2. `career-os/docs/adr.md` 자체에 "`docs/decisions/NNN-*.md` 14개를 통합" 같은 문장이 헤더 영역에 있을 수 있다. ADR-018 채택 시점에 사실상 이 문장은 historical 정보가 됐으므로 짧게 정리하거나 ADR-018 본문 안에서 한 번만 언급되도록.

3. `career-os/docs/hand-off/2026-04-25-morning-topic-recommendation-improvement-brief.md` — 본문 안에 옛 ADR 파일을 `docs/decisions/NNN-...md` 경로로 링크하는 곳이 있을 수 있다. 해당 링크를 `docs/adr.md` 의 해당 ADR-N 섹션 anchor 로 교체 (`docs/adr.md#adr-N-제목` 형태).

각 파일에서 grep 으로 정확한 줄 찾아 sed 또는 Edit 으로 교체. 다음을 따른다.

- 디렉터리 prose 언급: `docs/decisions/` → `docs/adr.md` (단일 출처).
- 개별 ADR 링크: `docs/decisions/009-morning-...md` → `docs/adr.md` 의 `## ADR-009 — Morning topic reservoir + recommendation pipeline` anchor 로.

### 5. 최종 docs/ 디렉터리 트리 확인

```bash
cd /home/bifos/ai-nodes
find career-os/docs -maxdepth 2 -type d -o -type f -name "*.md" | sort
```

기대 결과 (트리):

```
career-os/docs
career-os/docs/adr.md
career-os/docs/code-architecture.md
career-os/docs/data-schema.md
career-os/docs/flow.md
career-os/docs/prd.md
career-os/docs/hand-off/
career-os/docs/hand-off/2026-04-25-morning-topic-recommendation-improvement-brief.md
career-os/docs/learn/
career-os/docs/learn/008-docs-audit-quality-loop.md
career-os/docs/learn/README.md
career-os/docs/prep/
career-os/docs/prep/cj-foodville-coffeechat-30min-final-checklist.md
career-os/docs/prep/cj-foodville-coffeechat-strategy.md
```

decisions/ 디렉터리 없음, audit/ 디렉터리 없음, learn/{001..007} 없음.

## Critical Files

| 파일·디렉터리 | 변경 |
|---|---|
| `career-os/docs/decisions/[0-9]*.md` (15) | git rm |
| `career-os/docs/audit/*.md` (3) | git rm |
| `career-os/docs/learn/{001..007}.md` (7) | git rm |
| `career-os/AGENTS.md` | prose 갱신 (옛 decisions 언급) |
| `career-os/docs/adr.md` | 헤더 영역 짧게 정리 (옛 decisions 언급) |
| `career-os/docs/hand-off/2026-04-25-...md` | 본문 안 옛 ADR 링크 anchor 교체 |

다른 파일은 손대지 않는다. 특히 docs/learn/008-... + docs/prep/ 2 + 5문서 본체.

## 검증

```bash
cd /home/bifos/ai-nodes

# 1. legacy 디렉터리 모두 사라짐
[ ! -d career-os/docs/decisions ] || { echo "PHASE_FAILED: decisions/ 잔존"; exit 1; }
[ ! -d career-os/docs/audit ] || { echo "PHASE_FAILED: audit/ 잔존"; exit 1; }

# 2. legacy learn 7개 사라짐 (008은 보존)
[ ! -f career-os/docs/learn/001-discord-notification-routing.md ] || { echo "PHASE_FAILED: learn/001 잔존"; exit 1; }
[ -f career-os/docs/learn/008-docs-audit-quality-loop.md ] || { echo "PHASE_FAILED: learn/008 누락"; exit 1; }
ls career-os/docs/learn/[0-9]*.md | wc -l
# 기대값: 1 (008 한 개만)

# 3. 잔존 참조 0건 (docs/decisions/ prose 가 코드 / 다른 문서에서 더 이상 살아있지 않음)
count=$(grep -rln "docs/decisions/" career-os/ --include='*.md' --include='*.sh' --include='*.py' 2>/dev/null | grep -v "sources/fos-study" | wc -l)
echo "docs/decisions/ refs remaining: $count"
[ "$count" -eq 0 ] || { echo "PHASE_FAILED: docs/decisions/ 참조 잔존 $count건"; exit 1; }

# 4. 옛 learn 파일 직접 링크 잔존 0건
for old in 001-discord-notification-routing 002-fos-study-git-sequencing 003-agent-skill-direction-for-study-pack 004-fos-openclaw-and-fos-study-split 005-next-step-for-fos-openclaw-source-of-truth 006-fos-openclaw-target-tree 007-today-status-and-settled-directions; do
  count=$(grep -rln "$old\.md" career-os/ --include='*.md' 2>/dev/null | grep -v "sources/fos-study" | wc -l)
  [ "$count" -eq 0 ] || { echo "PHASE_FAILED: $old.md 참조 잔존"; exit 1; }
done

# 5. 5문서 본체 안 손댐 (adr.md / AGENTS.md 잔존 참조 갱신은 의도된 수정)
# 의도된 수정만이라 추가 검증 안 함. phase-03 통합 smoke 에서 5문서 valid 형태 확인.

echo "phase-02 검증 통과"
```

## 커밋

```
refactor(career-os): docs/ legacy 일괄 정리 (decisions 15 + audit 3 + learn 7)

ADR-018 정책 적용.

- docs/decisions/ 15 파일 삭제 — adr.md 통합본이 단일 출처. git history 로 추적.
- docs/audit/ 3 파일 삭제 — 4월 일회성 docs-audit 산출물. 영구 보존 불요.
- docs/learn/{001..007}.md 7 파일 삭제 — 결정·근거 모두 5문서·스킬 본체로 흡수 완료. 008 은 fos-study PR 별도 plan 위해 보존.
- AGENTS.md / adr.md / hand-off/<file> 의 옛 docs/decisions/ prose·링크 정리.
```

push 는 phase-03 에서.

## 의도 메모

- ADR-018 이 *왜* 의 단일 출처. 본 phase 는 그 결정의 *실행*.
- 008 보존은 fos-study 측 docs-audit SKILL.md 와의 통합 후 별도 사이클 — 즉시 삭제하면 fos-study 측 PR 흡수 흐름이 끊긴다.

## Blocked 조건

**중요 — exit code 명시**: 아래 어느 마커든 출력만 하지 말고 반드시 `sys.exit(1)` (FAILED) 또는 `sys.exit(2)` (BLOCKED) — shell에서는 `exit 1` / `exit 2` — 비-0 exit code로 종료한다. 마커만 출력하고 정상 종료하면 `run-phases.py`가 success로 잘못 처리한다 (plan001-adr-cleanup 1차 실행 사례).

- legacy 파일 수가 기대치와 다름 (decisions 가 15 아님 / audit 가 3 아님 / learn 가 8 아님) → `PHASE_BLOCKED: 사전 상태 mismatch` + `exit 2`.
- 검증 3-4 에서 잔존 참조가 0이 안 됨 → `PHASE_FAILED: 잔존 참조 정리 누락` + `exit 1`.
- 008 이 실수로 삭제됐는지 검증 2에서 잡힘 → `PHASE_FAILED: 008 보존 실패` + `exit 1`.
