# Phase 1 — draft/SKILL.md를 Read → target SKILL.md에 Write 적용

**Model**: sonnet
**Status**: pending

---

## 목표

`career-os/tasks/plan013-2-skill-rewrite-redo/draft/SKILL.md`(plan013-2 task 작성 시 별도 파일로 분리한 native skill 명세 진실 출처)를 **Read 도구**로 로드해서 그 내용을 **Write 도구**로 `career-os/.claude/skills/study-pack-writer/SKILL.md`에 **전면 덮어쓰기**.

**중요 — 본 phase는 반드시 다음 두 도구 호출을 모두 수행한다**:

1. `Read` 도구로 `career-os/tasks/plan013-2-skill-rewrite-redo/draft/SKILL.md` 로드
2. `Write` 도구로 `career-os/.claude/skills/study-pack-writer/SKILL.md`에 **draft 본문 그대로** 저장

prose 응답으로 "다음과 같이 작성했다"식 위장 종료 금지 (common-pitfalls 6-6). Write 도구 호출 0회면 자동 PHASE_FAILED.

**범위 외**: 정적 검증 (phase-02), commitSha audit 노트 (phase-03).

## 관련 docs (실행 전 필수 읽기)

- `skills/plan-and-build/references/common-pitfalls.md` 6-6 — 본 hotfix가 회복하는 함정 패턴.
- `career-os/tasks/plan013-study-pack-writer-native/` — plan013 1차 실행 history (phase-02 false success 사례).

## 사전 검증

```bash
cd /home/bifos/ai-nodes

# 1-A. draft 파일 존재 + 라인 수 충분
DRAFT=career-os/tasks/plan013-2-skill-rewrite-redo/draft/SKILL.md
test -f "$DRAFT" || { echo "PHASE_BLOCKED: draft 부재"; exit 2; }
DRAFT_LINES=$(wc -l < "$DRAFT")
[ "$DRAFT_LINES" -ge 80 ] || { echo "PHASE_BLOCKED: draft 라인 $DRAFT_LINES (expected ≥80)"; exit 2; }
echo "[사전] draft $DRAFT_LINES 줄 OK"

# 1-B. target 디렉터리 존재
TARGET=career-os/.claude/skills/study-pack-writer/SKILL.md
test -d "$(dirname "$TARGET")" || { echo "PHASE_BLOCKED: target 디렉터리 부재"; exit 2; }
echo "[사전] target 디렉터리 OK"

# 1-C. 현재 SKILL.md 백업 (history 보존)
test -f "$TARGET" && cp "$TARGET" "/tmp/study-pack-writer-SKILL-before-hotfix-$(date +%s).md"
BEFORE_LINES=$(wc -l < "$TARGET" 2>/dev/null || echo 0)
echo "[사전] 덮어쓰기 전 SKILL.md $BEFORE_LINES 줄 (보통 42)"
```

## 작업 항목

### 1. Read draft

`Read` 도구로 `career-os/tasks/plan013-2-skill-rewrite-redo/draft/SKILL.md` 전체 로드. 본문은 ~120줄 (frontmatter + 7 섹션 + Workflow 7-step).

### 2. Write target

`Write` 도구로 다음 위치에 **draft에서 읽은 내용을 그대로** 저장:

```
career-os/.claude/skills/study-pack-writer/SKILL.md
```

**주의**: Write는 *전체 덮어쓰기*. Edit이나 부분 수정 금지 (common-pitfalls 6-5: destructive를 additive로 위장 방지).

### 3. 즉시 자기 확인 (Write 도구 호출 검증)

Write 직후, 본 phase가 진짜로 Write를 호출했는지 즉시 확인:

```bash
cd /home/bifos/ai-nodes
TARGET=career-os/.claude/skills/study-pack-writer/SKILL.md
DRAFT=career-os/tasks/plan013-2-skill-rewrite-redo/draft/SKILL.md

# A. target 라인 수 ≥80
TARGET_LINES=$(wc -l < "$TARGET")
[ "$TARGET_LINES" -ge 80 ] \
  || { echo "PHASE_FAILED: target $TARGET_LINES 줄 (expected ≥80) — Write 호출 누락 의심"; exit 1; }

# B. target과 draft가 byte-for-byte 동일
diff -q "$TARGET" "$DRAFT" > /dev/null \
  || { echo "PHASE_FAILED: target ↔ draft 내용 불일치"; diff "$TARGET" "$DRAFT" | head -20; exit 1; }

# C. native 패턴 키워드 (Read / Write / Bash / Self-check / Workflow / Inputs / Error handling / References)
for kw in "Read" "Write" "Bash" "Self-check" "Workflow" "Inputs" "Error handling" "References"; do
  grep -q "$kw" "$TARGET" || { echo "PHASE_FAILED: '$kw' 키워드 누락"; exit 1; }
done

echo "[자기 확인] target=$TARGET_LINES 줄, draft 동일, 8 키워드 OK"
```

### 4. 커밋 + commit 개수 강제 검증

```bash
cd /home/bifos/ai-nodes

# 커밋 직전 HEAD 저장
HEAD_BEFORE=$(git rev-parse HEAD)
echo "[head] before=$HEAD_BEFORE"

git add career-os/.claude/skills/study-pack-writer/SKILL.md
git commit -m "$(cat <<'COMMIT_EOF'
feat(career-os): study-pack-writer SKILL.md를 native skill 살아있는 명세로 재작성 (plan013-2 phase-01 hotfix)

plan013 1차 실행 phase-02가 Write 도구를 호출하지 않고 prose-only로 종료
하여 SKILL.md가 옛 사람용 문서 그대로(42줄) 남은 사례를 회복.

draft를 phase 본문 코드 블록이 아닌 별도 파일
(plan013-2-skill-rewrite-redo/draft/SKILL.md)로 분리해 phase 본문이
"Read draft → Write target" 명령형으로만 작성됨.

본문 구성: When to use / Inputs (Read 6개) / Workflow 7-step (Topic 해석 →
Context 로드 → Overlap 점검 → 마크다운 작성 → Self-check ≤3회 →
Publish bash → Discord 알림) / Error handling 5상황 / Why this design /
References. self-check 명세는 SKILL.md 안에 박힘 (옛 외부 validator 대체).

common-pitfalls 6-6 적용.
COMMIT_EOF
)" || { echo "PHASE_FAILED: commit 실패"; exit 1; }

# 커밋 후 HEAD가 1개 commit만큼 움직였는지 강제 검증
HEAD_AFTER=$(git rev-parse HEAD)
COMMITS_MADE=$(git rev-list "$HEAD_BEFORE..$HEAD_AFTER" --count)
[ "$COMMITS_MADE" = "1" ] \
  || { echo "PHASE_FAILED: 본 phase가 만든 commit 수 $COMMITS_MADE (expected 1) — Write/commit 위장 의심"; exit 1; }
echo "[commit] $COMMITS_MADE개 commit 생성 OK ($HEAD_AFTER)"
```

push는 phase-02.

## Critical Files

| 파일 | 변경 |
|---|---|
| `career-os/.claude/skills/study-pack-writer/SKILL.md` | Write 전체 덮어쓰기 (draft에서 복제, byte-for-byte 동일) |

draft 파일은 그대로 둔다 — plan013-2 종료 후에도 history 보존 (다른 skill 마이그 시 *템플릿*으로 활용 가능).

## Blocked 조건

**중요 — exit code 명시**: 본문의 모든 검증 bash 블록은 반드시 Bash 도구로 직접 실행. prose로 마커만 출력하면 success로 잘못 처리 (common-pitfalls 6-1).

- draft 파일 부재 → `PHASE_BLOCKED: draft 부재` + `exit 2`
- target 디렉터리 부재 → `PHASE_BLOCKED: target 디렉터리 부재` + `exit 2`
- Write 후 자기 확인 A/B/C 중 하나 실패 → `PHASE_FAILED: <항목>` + `exit 1`
- commit 후 commit 수 ≠ 1 → `PHASE_FAILED: commit 위장 의심` + `exit 1`

## 의도 메모

- draft를 phase 본문 코드 블록이 아닌 *별도 파일*로 분리 — common-pitfalls 6-6 핵심 방어선.
- phase 본문이 "Read draft → Write target" 명령형 한 단락으로만 구성. 모델이 prose-only 우회할 수 있는 해석 여지 제거.
- 자기 확인 단계에 byte-for-byte diff + commit 개수 검증 — Write 위장도 commit 위장도 즉시 잡힘.
