# Phase 1 — 12 skill mv + 깨진 심링크 정리 + 경로 grep 갱신

**Model**: sonnet
**Status**: pending

---

## 목표

ai-nodes ADR-002의 "skill 위치 단일 출처" 결정을 career-os에 적용. 현재 이중 구조(`career-os/skills/<name>/` 실체 + `career-os/.claude/skills/<name>/` 심링크 7개, 그중 2개는 깨짐)를 `career-os/.claude/skills/<name>/` 실체 단일로 일원화.

**범위 외**: 어느 skill의 SKILL.md 본문 *재작성* (phase-02), scripts/study-pack-writer 폐기 (phase-03), 통합 정적 검증 + push (phase-04). 본 phase는 *위치 이동만*, 11개 skill의 SKILL.md 본문은 그대로 (옛 사람용 문서 상태) — 그것들은 후속 plan에서 점진 마이그.

## 관련 docs (실행 전 필수 읽기)

- `docs/adr.md` ai-nodes ADR-002 — skill 위치 단일 출처 결정의 *왜*.
- `career-os/AGENTS.md` 워크플로 진입점 — plan013 이후 동작 안내 (이미 갱신됨).

## 사전 검증

```bash
cd /home/bifos/ai-nodes

# 1-A. 옛 실체 디렉터리 12개 존재
COUNT=$(ls -1 career-os/skills/ 2>/dev/null | wc -l)
[ "$COUNT" = "12" ] || { echo "PHASE_BLOCKED: career-os/skills 디렉터리 수 $COUNT (expected 12)"; exit 2; }

# 1-B. 옛 .claude/skills 심링크 7개 (이중 구조 확인)
LINK_COUNT=$(find career-os/.claude/skills/ -maxdepth 1 -type l 2>/dev/null | wc -l)
[ "$LINK_COUNT" = "7" ] || { echo "PHASE_BLOCKED: 옛 심링크 수 $LINK_COUNT (expected 7)"; exit 2; }

echo "사전 검증 OK"
```

## 작업 항목

### 1. 옛 심링크 7개 일괄 제거

```bash
cd /home/bifos/ai-nodes/career-os/.claude/skills
for l in cj-oliveyoung-java-backend-prep docs-audit experience-question-bank-writer fos-study-pack interview-master-writer study-pack-maintainer study-pack-writer; do
  [ -L "$l" ] && rm "$l" && echo "rm symlink: $l"
done
cd /home/bifos/ai-nodes
```

깨진 심링크(cj-oliveyoung, fos-study-pack)도 함께 제거 — `rm` 은 깨진 심링크에도 동작.

### 2. 12개 skill 실체 디렉터리를 `.claude/skills/`로 git mv

```bash
cd /home/bifos/ai-nodes
for skill in $(ls -1 career-os/skills/); do
  git mv "career-os/skills/$skill" "career-os/.claude/skills/$skill"
  echo "mv: $skill"
done

# 빈 career-os/skills/ 디렉터리 정리
rmdir career-os/skills 2>/dev/null && echo "rmdir career-os/skills/"
```

### 3. 자동 검증 — 새 위치 12개 + 옛 위치 0

```bash
cd /home/bifos/ai-nodes

# 새 위치 12개
NEW=$(find career-os/.claude/skills/ -maxdepth 1 -mindepth 1 -type d 2>/dev/null | wc -l)
[ "$NEW" = "12" ] || { echo "PHASE_FAILED: 새 위치 skill 수 $NEW (expected 12)"; exit 1; }
echo "[3-A] 새 위치 12 skill OK"

# 옛 위치 없음
[ ! -d career-os/skills ] || { echo "PHASE_FAILED: career-os/skills 잔존"; exit 1; }
echo "[3-B] 옛 위치 없음 OK"

# 깨진 심링크 검사 (.claude/skills 안 모든 entry가 실체 디렉터리)
BROKEN=$(find career-os/.claude/skills/ -maxdepth 1 -mindepth 1 \( -type l ! -exec test -e {} \; -print \) 2>/dev/null | wc -l)
[ "$BROKEN" = "0" ] || { echo "PHASE_FAILED: 깨진 심링크 $BROKEN개"; exit 1; }
echo "[3-C] 깨진 심링크 0 OK"
```

### 4. 옛 경로 참조 grep + 갱신

코드·docs·task 안에서 `career-os/skills/<name>` 절대 경로 또는 `skills/<name>/` 상대 경로 참조 검색:

```bash
cd /home/bifos/ai-nodes
echo "=== career-os/skills/ 참조 위치 ==="
grep -rln "career-os/skills/" career-os/scripts/ career-os/docs/ career-os/AGENTS.md 2>/dev/null | head -20

# Read 결과 보고 옛 경로 → 새 경로 (career-os/.claude/skills/) Edit으로 일괄 갱신
# 단 다음은 *의도된 보존* 잔재 (history reference):
# - career-os/docs/adr.md 안 옛 결정 본문 (ADR-005, ADR-006 등)
# - career-os/tasks/plan*/ 안 옛 plan 본문 (history)
# 이 둘은 변경 금지. 갱신 대상은 코드 호출 경로 + 현행 docs(5문서) 본문만.
```

phase 실행 Claude는 위 grep 결과를 보고 *코드 호출 경로* + *현행 5문서 prose*만 Edit으로 갱신. ADR / task 본문은 history라 보존.

### 5. AGENTS.md / code-architecture.md 디렉터리 트리 갱신

`career-os/docs/code-architecture.md`에 옛 `skills/` 트리가 있으면 `.claude/skills/`로 변경. `career-os/AGENTS.md` 안에 `skills/<name>` 참조 있으면 `.claude/skills/<name>`로.

## Critical Files

| 파일·디렉터리 | 변경 |
|---|---|
| `career-os/skills/*` (12) | git mv → `career-os/.claude/skills/*` |
| `career-os/skills/` | rmdir (빈 디렉터리) |
| `career-os/.claude/skills/*` (옛 7 심링크) | rm (깨진 포함) |
| `career-os/docs/code-architecture.md` | 디렉터리 트리 |
| `career-os/AGENTS.md` | 부분 prose (현행 참조) |
| 기타 코드 (career-os/scripts/) | 옛 `career-os/skills/<name>/references/...` 절대 경로 import grep + 갱신 |

ADR / task 본문은 history 보존이라 변경 금지.

## 커밋

```bash
cd /home/bifos/ai-nodes
git add career-os/.claude/skills/ career-os/skills/ career-os/AGENTS.md career-os/docs/code-architecture.md career-os/scripts/
git commit -m "refactor(career-os): skill 위치를 .claude/skills/ 단일로 일원화 (plan013 phase-01, ai-nodes ADR-002)

12개 skill 디렉터리를 career-os/skills/ → career-os/.claude/skills/로 git mv.
깨진 심링크 2개(cj-oliveyoung, fos-study-pack) + 정상 심링크 5개 일괄 제거.
이중 구조 폐기 → 단일 출처. Claude Code 자동 로드 메커니즘 정합.

- 12 git mv: cj-foodville-coffeechat-prep, command-router, docs-audit,
  experience-question-bank-writer, interview-master-writer,
  knowledge-gap-analyzer, position-recommender, study-pack-batch,
  study-pack-maintainer, study-pack-writer, study-topic-recommender,
  topic-pool-replenisher
- rm 7 symlinks (career-os/.claude/skills/*)
- rmdir career-os/skills/
- code-architecture.md 트리 + AGENTS.md prose 갱신

11개 skill의 SKILL.md 본문은 phase-01 범위 외 (옛 사람용 문서 그대로). study-pack-writer SKILL.md는 phase-02에서 native skill 명세로 재작성."
```

push는 phase-04.

## 검증

```bash
cd /home/bifos/ai-nodes

# 1. 12 skill 새 위치
NEW=$(find career-os/.claude/skills/ -maxdepth 1 -mindepth 1 -type d 2>/dev/null | wc -l)
[ "$NEW" = "12" ] || { echo "PHASE_FAILED: 새 위치 skill 수 $NEW"; exit 1; }

# 2. 옛 위치 없음
[ ! -d career-os/skills ] || { echo "PHASE_FAILED: career-os/skills 잔존"; exit 1; }

# 3. 깨진 심링크 0
BROKEN=$(find career-os/.claude/skills/ -maxdepth 1 -mindepth 1 \( -type l ! -exec test -e {} \; -print \) 2>/dev/null | wc -l)
[ "$BROKEN" = "0" ] || { echo "PHASE_FAILED: 깨진 심링크 $BROKEN개"; exit 1; }

# 4. 코드/현행 docs에 옛 career-os/skills/ 경로 잔재 0건 (history docs/tasks 제외)
HITS=$(grep -rln "career-os/skills/" career-os/scripts/ career-os/AGENTS.md career-os/docs/code-architecture.md career-os/docs/flow.md career-os/docs/prd.md 2>/dev/null)
[ -z "$HITS" ] || { echo "PHASE_FAILED: 옛 경로 잔재"; echo "$HITS"; exit 1; }

# 5. bash syntax (code-architecture.md에 trail이 없으면 OK)
echo "phase-01 검증 통과"
```

## Blocked 조건

**중요 — exit code 명시**: 아래 어느 마커든 출력만 하지 말고 반드시 `exit 1` (FAILED) 또는 `exit 2` (BLOCKED) — 본 phase의 모든 검증 bash 블록은 반드시 Bash 도구로 직접 실행 (prose로 마커만 출력하면 run-phases.py가 success로 잘못 처리 — plan001/plan004 사례).

- 옛 실체 디렉터리 수 != 12 → `PHASE_BLOCKED: 사전 상태 mismatch` + `exit 2`
- 깨진 심링크 잔존 → `PHASE_FAILED: broken symlinks` + `exit 1`
- 옛 경로 grep 잔재 → `PHASE_FAILED: 잔재 참조` + `exit 1`

## 의도 메모

- 모든 skill을 함께 이동하는 이유: 이중 구조 자체가 위험. 한 번에 단일화.
- 11 skill의 SKILL.md 본문은 *그대로*. 옛 외부 subprocess 패턴 그대로 동작 — dispatcher case (`run_now.sh`)도 유지. 본 phase는 *위치만* 변경.
- ADR / 옛 task 본문 안 `career-os/skills/` 언급은 history라 보존. 갱신 대상은 *현행 코드 호출 + 현행 5문서 prose*만.
