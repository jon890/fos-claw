# Phase 2 — study-pack-writer SKILL.md를 살아있는 native skill 명세로 재작성

**Model**: sonnet
**Status**: pending

---

## 목표

phase-01에서 `career-os/.claude/skills/study-pack-writer/SKILL.md`로 이동된 옛 사람용 문서를 **native Claude Code skill의 살아있는 동작 명세**로 재작성. 본 SKILL.md를 자동 로드한 Claude가 도구로 직접 study pack을 생성·검증·발행할 수 있는 형태.

**범위 외**: 옛 scripts/study-pack-writer/ 폐기 (phase-03), dispatcher case 제거 (phase-03), 통합 정적 검증 + push (phase-04).

## 관련 docs (실행 전 필수 읽기)

- `docs/adr.md` ai-nodes ADR-002 — native skill 패턴 결정의 *왜*.
- `career-os/.claude/skills/study-pack-writer/references/study-pack-prompt.md` — 옛 prompt 가이드 (재작성 참고용)
- `career-os/.claude/skills/study-pack-writer/references/study-pack-writing-rules.md` — 옛 작성 규칙 (재작성 참고용)
- `career-os/docs/adr.md` ADR-005 / ADR-006 / ADR-007 — study-pack 출력 정책 + 엔트리포인트 history (참고)

## 사전 검증

```bash
cd /home/bifos/ai-nodes

# 1-A. 새 위치 SKILL.md 존재
test -f career-os/.claude/skills/study-pack-writer/SKILL.md \
  || { echo "PHASE_BLOCKED: phase-01 미완 — 새 위치 SKILL.md 없음"; exit 2; }

# 1-B. references 2개 존재
test -f career-os/.claude/skills/study-pack-writer/references/study-pack-prompt.md \
  || { echo "PHASE_BLOCKED: references/study-pack-prompt.md 없음"; exit 2; }
test -f career-os/.claude/skills/study-pack-writer/references/study-pack-writing-rules.md \
  || { echo "PHASE_BLOCKED: references/study-pack-writing-rules.md 없음"; exit 2; }

echo "사전 검증 OK"
```

## 작업 항목

### 1. SKILL.md 재작성 (Write 도구 — 전체 덮어쓰기)

`career-os/.claude/skills/study-pack-writer/SKILL.md`를 다음 명세로 **전체 덮어쓰기** (Edit 부분 수정 금지 — 옛 사람용 문서를 새 *동작 명세*로 destructive 재작성).

본문 구성 (~130줄):

#### Frontmatter
```yaml
---
name: study-pack-writer
description: backend 면접 준비용 study pack 마크다운을 생성하고 sources/fos-study 저장소에 자동 발행. /study-pack <topic-key-or-자연어> 슬래시 명령 또는 "<주제> study pack 만들어줘" / "<주제> 학습 정리해줘" / "<주제>에 대한 스터디팩" 같은 자연어 요청 시 무조건 사용. backend·db·infrastructure·언어·아키텍처 주제로 fos-study에 즉시 commit/push해야 하는 작업이면 이 skill을 호출.
---
```

#### 본문 섹션 (8개)

1. **Overview** — 한 줄 + 산출물 위치
2. **When to use** — 슬래시 / 자연어 패턴 / publish 필요 케이스
3. **Inputs** — Read해야 할 자산 6개 (topics.json / candidate-profile / mvp-target / references 2 / overlap 점검)
4. **Workflow** — 7 step
   - 1) Topic 해석 (topic-key 매칭 vs 자연어 vs freeform)
   - 2) Context 로드 (Read 4)
   - 3) Overlap 점검 (선택)
   - 4) 마크다운 작성 (Write) — 구조 명시 (# 시작 / ≥80줄 / 펜스 언어 / 금지 prefix)
   - 5) Self-check (5항목, 최대 3회 재작성)
   - 6) Publish (Bash — git pull --rebase, add, commit, push)
   - 7) Discord 알림 (Bash — bun ... notify_discord.ts)
5. **Error handling** — 5상황 표 (topic 매칭 실패 / fos-study 부재 / self-check 3회 실패 / git push 실패 / Discord 실패)
6. **Why this design** — 3개 결정 근거 (self-check 내장 / 재작성 3회 cap / publish+notify Bash 통합)
7. **References** — references/ 2개 인덱스

상세 본문은 다음 reference draft (이미 사용자와 검토 완료한 v1):

```markdown
---
name: study-pack-writer
description: backend 면접 준비용 study pack 마크다운을 생성하고 sources/fos-study 저장소에 자동 발행. /study-pack <topic-key-or-자연어> 슬래시 명령 또는 "<주제> study pack 만들어줘" / "<주제> 학습 정리해줘" / "<주제>에 대한 스터디팩" 같은 자연어 요청 시 무조건 사용. backend·db·infrastructure·언어·아키텍처 주제로 fos-study에 즉시 commit/push해야 하는 작업이면 이 skill을 호출.
---

# Study Pack Writer

backend 면접 준비용 학습 마크다운(study pack) 생성·검증·발행 workflow.

## When to use

- 사용자가 `/study-pack <topic>` 슬래시 호출
- 자연어 요청: "MySQL 인덱스 study pack 만들어줘", "Redis 캐시 전략 학습 자료 정리해줘"
- fos-study repo에 즉시 publish할 study pack이 필요한 모든 경우

## Inputs

Claude는 다음을 `Read` 도구로 직접 로드:

1. `career-os/config/topics.json` — `study-pack` namespace에서 `<topic-key>` 검색 → `outputPath` / `domain` / `title` / `promptAppend`
2. `career-os/config/candidate-profile.md` — 11섹션 prose, 후보자 이력
3. `career-os/config/mvp-target.json` — `primary.company`, `primary.role` (현재 면접 타깃)
4. `references/study-pack-prompt.md` — prompt 구조 가이드
5. `references/study-pack-writing-rules.md` — 작성 규칙 상세
6. (선택) `sources/fos-study/<유사 outputPath>.md` — overlap 회피

## Workflow

### 1. Topic 해석

인자가 topic-key (kebab-case)면 `topics.json["study-pack"]` 매칭. 자연어면 description/domain으로 유사 매칭. 매칭 실패 시 **freeform 모드**: domain·outputPath 본인이 결정. stderr에 결정 근거 1줄 로그.

### 2. Context 로드 (4 Read)

위 Inputs 1~5 모두 Read.

### 3. Overlap 점검 (선택)

`sources/fos-study/<outputPath 디렉터리>`에 유사 파일 있으면 update 의도 확인. update면 기존 본문 Read해서 통합 작성.

### 4. 마크다운 작성 (Write)

생성 구조:
- 첫 줄: `# <topic-title>` (단일 `#`, `## ` 시작 금지, `# 초안:` / `# Draft:` 금지)
- ≥80줄
- 모든 ` ``` ` 코드 펜스에 언어 명시 (`bash`, `ts`, `sql`, `java` 등)
- 백엔드 면접 관점: 개념 → 작동 원리 → 흔한 오해 → 면접 질문 시뮬레이션
- `references/study-pack-writing-rules.md` 모든 규칙 준수

`Write` 도구로 `career-os/sources/fos-study/<outputPath>.md`에 직접 저장.

### 5. Self-check (재작성 ≤3회)

작성 후 자기 출력 점검 5항목:

1. 첫 줄 `# ` 시작 (`## ` 아닌)
2. 총 줄 수 ≥80
3. 모든 펜스 언어 지정
4. 금지 prefix 부재
5. `references/study-pack-writing-rules.md` 명시 규칙 준수

실패 항목이 있으면 그 항목 수정 후 재작성·재검증. **최대 3회 시도**. 4회째도 실패 시 stderr에 `study-pack 검증 실패: <실패 항목>` + 종료 (exit 1).

검증 명세를 본 skill 안에 박는 이유: 객관적(첫 줄·줄 수·펜스 언어) 기준은 self-check가 신뢰 가능. 3회 cap은 무한 루프 차단.

### 6. Publish (Bash)

```bash
cd career-os/sources/fos-study
git pull --rebase --autostash
git add <outputPath>
git commit -m "docs(<domain>): add|update <topic-key>"
git push origin main
```

`<domain>`은 topic에서 추출(database/redis/kafka/java/infra/architecture). add vs update는 `git status --porcelain`으로 자동 판단. push 실패 시 stderr + exit 1 (silent 실패 금지).

### 7. Discord 알림 (Bash)

```bash
bun --env-file=career-os/.env _shared/lib/notify_discord.ts \
  "[완료] study-pack <topic-key>: sources/fos-study/<outputPath>.md"
```

알림 실패는 비치명적 — stderr warn만, skill 자체는 success 종료.

## Error handling

| 상황 | 처리 |
|---|---|
| topic-key 매칭 실패 + 자연어 해석 불가 | stderr + exit 1, 사용자에게 명시적 topic 요청 |
| sources/fos-study 없음 or git pull 실패 | stderr + exit 1, 환경 설정 안내 |
| self-check 3회 실패 | stderr + exit 1, 실패 항목 명시 |
| git push 실패 (권한/충돌) | stderr + exit 1, git stderr 그대로 |
| Discord notify 실패 | stderr warn, skill은 success |

## Why this design

- **Self-check 본 skill 안에 박는 이유**: 옛 외부 validator를 Claude 자체 검증으로. SKILL.md 단일 진실 출처.
- **재작성 ≤3회**: 무한 루프 차단. 3회로도 통과 못 하면 본질 문제 (topic 모호, 입력 부족) — 사용자 개입 필요.
- **Publish + notify 통합**: 옛 외부 publish/notify shell을 Bash 도구로 직접. 의존 줄임.

## References

- `references/study-pack-prompt.md` — 옛 prompt 구조 (Claude가 참고)
- `references/study-pack-writing-rules.md` — 작성 규칙 상세
```

## Critical Files

| 파일 | 변경 |
|---|---|
| `career-os/.claude/skills/study-pack-writer/SKILL.md` | Write 전체 덮어쓰기 (옛 사람용 문서 → 살아있는 동작 명세) |

`references/`는 그대로. 다른 skill SKILL.md는 손대지 않는다 (후속 plan에서 점진 마이그).

## 커밋

```bash
cd /home/bifos/ai-nodes
git add career-os/.claude/skills/study-pack-writer/SKILL.md
git commit -m "feat(career-os): study-pack-writer SKILL.md를 native skill 살아있는 명세로 재작성 (plan013 phase-02)

ai-nodes ADR-002 적용. 옛 사람용 reference 문서를 Claude가 자동 로드해서
도구로 직접 동작할 수 있는 살아있는 명세로 재작성.

본문 구성: Overview / When to use / Inputs / Workflow 7-step (Topic 해석 →
Context 로드 → Overlap 점검 → 마크다운 작성 → Self-check 3회 재작성 →
Publish → Discord 알림) / Error handling 5상황 / Why this design / References.

self-check 명세는 본 SKILL 안에 박힘 — 옛 외부 validator
(extract_and_validate_study_pack.ts) 대체. 객관적 기준(첫 줄 # / ≥80줄 /
펜스 언어 / 금지 prefix / writing-rules 규칙) self-check 5항목 + 3회 cap."
```

push는 phase-04.

## 검증

```bash
cd /home/bifos/ai-nodes
SKILL=career-os/.claude/skills/study-pack-writer/SKILL.md

# 1. 파일 존재 + 줄 수 (~130 ± 30)
LINES=$(wc -l < "$SKILL")
[ "$LINES" -ge 80 ] && [ "$LINES" -le 200 ] \
  || { echo "PHASE_FAILED: SKILL.md 줄 수 $LINES (expected 80-200)"; exit 1; }
echo "[1] SKILL.md 줄 수 $LINES OK"

# 2. frontmatter 존재 + name/description 필드
head -10 "$SKILL" | grep -q '^name: study-pack-writer$' \
  || { echo "PHASE_FAILED: name field 누락"; exit 1; }
head -10 "$SKILL" | grep -q '^description:' \
  || { echo "PHASE_FAILED: description field 누락"; exit 1; }
echo "[2] frontmatter OK"

# 3. 필수 섹션 존재
for s in "When to use" "Inputs" "Workflow" "Self-check" "Publish" "Error handling" "References"; do
  grep -q "^## .*$s\|^### .*$s" "$SKILL" \
    || { echo "PHASE_FAILED: 섹션 '$s' 누락"; exit 1; }
done
echo "[3] 필수 섹션 7개 OK"

# 4. 핵심 도구 사용 keyword 명시 (Read / Write / Bash)
for kw in "Read" "Write" "Bash"; do
  grep -q "$kw" "$SKILL" || { echo "PHASE_FAILED: '$kw' 도구 keyword 누락"; exit 1; }
done
echo "[4] 도구 keyword OK"

# 5. self-check 5항목 + 3회 cap 명시
grep -q "최대 3회\|≤3회\|3회 cap" "$SKILL" \
  || { echo "PHASE_FAILED: 재작성 3회 cap 명시 누락"; exit 1; }
echo "[5] 3회 cap OK"

# 6. 옛 외부 subprocess 잔재 0건 (build_prompt / extract_and_validate / study_pack_publish 같은 키워드는 *적용 사례 설명*으로 들어가도 OK이나 *동작 명세*로 들어가면 안 됨)
# 단순 검증: claude --print --output-format json subprocess 호출 명시 없어야
grep -q 'claude --print\|claude --output-format' "$SKILL" \
  && { echo "PHASE_FAILED: 옛 subprocess 패턴 잔재"; exit 1; } || true
echo "[6] 옛 subprocess 잔재 0 OK"

echo "phase-02 검증 통과"
```

## Blocked 조건

**중요 — exit code 명시**: 본문의 모든 검증 bash 블록은 반드시 Bash 도구로 직접 실행. prose로 마커만 출력하면 success로 잘못 처리.

- 새 위치 SKILL.md 부재 → `PHASE_BLOCKED: phase-01 미완` + `exit 2`
- references/ 부재 → `PHASE_BLOCKED: references 누락` + `exit 2`
- 검증 1~6 중 하나 실패 → `PHASE_FAILED: <항목>` + `exit 1`

## 의도 메모

- Write로 전체 덮어쓰기 — Edit으로 옛 사람용 문서 일부만 바꾸면 잔재 위험 (common-pitfalls 6-5).
- 재작성 본문은 사용자와 검토 완료한 v1 draft 그대로. 후속 plan에서 다른 skill 마이그 시 본 SKILL.md를 *템플릿*으로 활용 가능.
- self-check 명세를 본 skill 안에 박는 게 핵심 — 옛 외부 validator가 별도 subprocess였음. native 패턴에선 Claude가 자기 검증 + 재작성.
