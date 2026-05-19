# Phase 02 — SKILL.md mode 분기 + coffeechat-prompt.md first-round 가이드 + collect_company_sites.ts mode 인자

**Model**: sonnet
**Status**: pending

---

## 목표

ADR-034 (interview-coffeechat-prep 4 mode 일반화) 적용 단계 2.

1. `career-os/.claude/skills/interview-coffeechat-prep/SKILL.md` 본문에 mode 분기 추가 (When to use / Inputs / Workflow / Self-check).
2. `career-os/.claude/skills/interview-coffeechat-prep/references/coffeechat-prompt.md` 에 first-round 가이드 + public-safe sanitize 규칙 추가.
3. `career-os/scripts/interview-coffeechat-prep/collect_company_sites.ts` 가 `--mode <mode>` 인자 받도록 수정 (default coffeechat — backward compat).

**범위 외**: 스키마 + mvp-target.json 마이그 (phase-01 완료 가정), 통합 검증 (phase-03).

---

## 사전 cwd 설정 (run-phases.py hotfix 표준)

```bash
cd "$(git rev-parse --show-toplevel)"
pwd  # 기대: /home/bifos/ai-nodes
```

---

## 본 phase 강제 주의문

- 반드시 Write / Edit 도구로 파일 본문 변경. prose 응답만 출력하면 PHASE_FAILED (common-pitfalls 6-6).
- SKILL.md 재작성 시 references/ 안 파일 audit 동시 진행 (common-pitfalls 6-7) — coffeechat-prompt.md 도 함께 갱신.
- 본 phase 종료 시 commit 개수 self-check: 1.

---

## 관련 docs

- 적용 ADR: `career-os/docs/adr.md` ADR-034
- 흐름: `career-os/docs/flow.md` `/interview-coffeechat-prep [mode]` 섹션 (plan026 갱신)

---

## 작업 항목

### 1. SKILL.md mode 분기 본문 추가

`Read` 도구로 `career-os/.claude/skills/interview-coffeechat-prep/SKILL.md` 현재 본문 확인.

수정 영역:

**description (frontmatter)** — mode 4 종 명시:
> 면접 준비 — 4 mode (coffeechat / first-round / final-round / offer-chat) 일반화. 현 active 타깃 기업의 회사 사이트 자동 수집 + 후보자 프로필 결합 + Claude 분석으로 private + public-safe 리포트 두 파일 생성. mode 결정: slash arg 우선, 자연어 키워드 (`커피챗`, `1차 면접`, `최종 면접`, `오퍼챗`) fallback. fos-study가 아닌 비공개 career-os 리포트. mvp-target.json `primary.interview.<mode>` 단일 출처. ADR-029 + ADR-034.

**When to use** 섹션:
- `/interview-coffeechat-prep [mode]` slash 호출 (mode 생략 시 coffeechat default)
- 자연어 분기: `1차 면접` / `first-round` → first_round, `최종 면접` / `final-round` → final_round, `오퍼챗` / `offer-chat` → offer_chat, 그 외 → coffeechat

**Inputs 1번 항목 수정** — `primary.coffeechat` 인용을 `primary.interview.<mode>` 로 갱신.

**Workflow 1번 ("mvp-target.json 파싱") 수정**:
- zod parse → `primary.interview` 객체 추출 + mode 결정
- 해당 mode 객체가 null 이면 "<mode> 설정 없음 — config/mvp-target.json `primary.interview.<mode>` 채움 필요" + exit 1

**Workflow 2번 ("사이트 수집") 수정**:
- `bun ... collect_company_sites.ts --mode <mode>` 호출

**Workflow 4번 ("Claude 분석") 수정** — 두 파일 동시 생성:
- `report.md` (private) + `report-public.md` (sanitized, public-safe)
- mode 별 분석 영역 (first-round: 회사·비즈니스 / 역할·팀 / 후보자 포지셔닝 / 예상 질문 / 역질문)
- public-safe 마스킹 정책은 `references/coffeechat-prompt.md` 가이드 따름

**Workflow 5번 ("리포트 저장") 수정**:
- `data/reports/daily/YYYY-MM-DD/<mode_obj.report_slug>/{report.md, report-public.md}`
- `data/runtime/<mode_obj.report_slug>.md` (private 사본)

**Self-check 항목 추가**:
- `report-public.md` 파일 존재 확인
- public-safe 본문에 개인명 / 추수 액수 / 내부 리서치 마스킹 정합 (가이드 따름)

**Error handling 표 추가 행**:
| `primary.interview.<mode>` null | "<mode> 설정 없음" + exit 1 |
| `--mode <unknown>` | "지원되지 않는 mode" + exit 1 (지원: coffeechat / first-round / final-round / offer-chat) |

### 2. coffeechat-prompt.md first-round 가이드 추가

`Read` 후 본문 끝에 추가:

```markdown
## First-Round 모드 가이드 (ADR-034, plan026)

mode = first-round 일 때 다음 5 영역으로 분석:

1. **회사·비즈니스 분석** — 수집 사이트 기반 회사 핵심 사업 / 매출 구조 / 최근 1년 변화 / 산업 위치
2. **역할·팀 전략** — `primary.team` / `primary.role` 와 후보자 프로필 매칭 — 어떤 강점이 직접 적용 가능한지
3. **후보자 포지셔닝** — 4-5 핵심 스토리 (task / resume 인용) + 어떤 강조점이 본 role 에 가장 효과적인지
4. **예상 질문 + 답변 포인트** — 회사 도메인 / 기술 스택 / 후보자 약점 영역에서 예상되는 질문 + 1분 답변 시드
5. **역질문 후보** — 회사 / 팀 / 역할 / 커리어 관점 각 1개

## Public-safe sanitize 규칙

`report-public.md` 작성 시 다음 항목 마스킹:

- 개인명 (후보자 본인 제외) — `<동료 A>`, `<면접관 B>` 형태
- 추수 액수 / 연봉 / 협상 정보 — `[연봉 정보 비공개]` 또는 제거
- 회사 내부 리서치 (커피챗에서 얻은 비공식 정보) — 제거 또는 추상화
- 비공개 자료 출처 (특정 사내 문서명, Slack 내용 등) — 제거
- 후보자 약점·미흡 영역 — 약화 표현 또는 제거 (예: "DB 약점" → "추가 학습 영역")

public-safe 자체로 fos-study 발행 가능한 수준이어야 함 — 단 본 skill 의 책임은 sanitize 까지, 실제 publish 는 별도 사용자 결정.
```

### 3. collect_company_sites.ts mode 인자

`Read` 후 인자 파싱 부분 수정:

```typescript
// 기존: const argv = process.argv.slice(2); + --outdir 만 파싱
// 추가: --mode <coffeechat|first-round|final-round|offer-chat> 인자
//       default 는 'coffeechat' (backward compat)
//       mode 값으로 mvp-target.json primary.interview.<mode> 객체 조회

const args = parseArgs(process.argv.slice(2));
const mode = args.mode ?? 'coffeechat';
const validModes = ['coffeechat', 'first-round', 'final-round', 'offer-chat'];
if (!validModes.includes(mode)) {
  console.error(`Unknown mode: ${mode}. Supported: ${validModes.join(', ')}`);
  process.exit(1);
}

// mode 키 매핑: 'first-round' → 'first_round' 등 (snake_case)
const modeKey = mode.replace(/-/g, '_');
const target = parsed.primary.interview?.[modeKey];
if (!target) {
  console.error(`primary.interview.${modeKey} 설정 없음 in mvp-target.json`);
  process.exit(1);
}

// 이후 sites / source_dir / 기존 흐름은 target.sites / target.source_dir 사용
```

`outdir` 기본값: `--outdir` 명시 시 그 값, 아니면 `data/source/${target.source_dir}/` 자동 계산.

### 4. 검증

```bash
# 1. SKILL.md 본문 mode 분기 등록
grep -q "first-round" career-os/.claude/skills/interview-coffeechat-prep/SKILL.md || { echo "PHASE_FAILED: SKILL.md first-round 분기 누락"; exit 1; }
grep -q "report-public.md" career-os/.claude/skills/interview-coffeechat-prep/SKILL.md || { echo "PHASE_FAILED: SKILL.md public-safe 산출물 누락"; exit 1; }
echo "[SKILL.md 갱신] OK"

# 2. coffeechat-prompt.md first-round 가이드 등록
grep -q "First-Round 모드 가이드" career-os/.claude/skills/interview-coffeechat-prep/references/coffeechat-prompt.md || { echo "PHASE_FAILED: prompt first-round 가이드 누락"; exit 1; }
grep -q "Public-safe sanitize" career-os/.claude/skills/interview-coffeechat-prep/references/coffeechat-prompt.md || { echo "PHASE_FAILED: prompt sanitize 규칙 누락"; exit 1; }
echo "[prompt 가이드] OK"

# 3. collect_company_sites.ts mode 인자
grep -q "first-round\|first_round" career-os/scripts/interview-coffeechat-prep/collect_company_sites.ts || { echo "PHASE_FAILED: ts mode 인자 누락"; exit 1; }
echo "[ts mode 인자] OK"

# 4. ts 컴파일 확인 (bun type check)
bun --eval "
import.meta.main;
const proc = Bun.spawn(['bun', '--print', 'import(\"./career-os/scripts/interview-coffeechat-prep/collect_company_sites.ts\")']);
await proc.exited;
" 2>&1 || { echo "[ts import check] non-fatal"; }
```

### 5. commit

```bash
git add career-os/.claude/skills/interview-coffeechat-prep/SKILL.md \
        career-os/.claude/skills/interview-coffeechat-prep/references/coffeechat-prompt.md \
        career-os/scripts/interview-coffeechat-prep/collect_company_sites.ts

git commit -m "$(cat <<'COMMIT_EOF'
feat(career-os): interview-coffeechat-prep SKILL.md + prompt + collector 4 mode 분기 (plan026 phase-02)

ADR-034 적용 2/2:
- SKILL.md: description 4 mode 명시 + When to use / Inputs / Workflow / Self-check / Error handling 분기
- coffeechat-prompt.md: First-Round 모드 가이드 (5 분석 영역) + Public-safe sanitize 규칙 (5 마스킹 항목)
- collect_company_sites.ts: --mode 인자 (coffeechat / first-round / final-round / offer-chat). default coffeechat. mode 매핑: dash → snake_case
- 산출물 2 파일 동시 (report.md private + report-public.md sanitized)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
COMMIT_EOF
)"

COMMITS=$(git log --format='%H' HEAD~1..HEAD | wc -l)
[ "$COMMITS" -eq 1 ] || { echo "PHASE_FAILED: phase commit $COMMITS != 1"; exit 1; }
echo "✓ Phase 02 검증 통과"
```

---

## 의도 메모

- SKILL.md 분기 + prompt 가이드 + collector mode 인자 — 3 파일이 mode 일반화의 최소 단위.
- references/ 안 coffeechat-prompt.md 본문 audit 동시 — SKILL.md 재작성 시 references 잔재 위험 (common-pitfalls 6-7) 회피.
- ts mode 인자 default coffeechat — 옛 호출 (`bun ... collect_company_sites.ts --outdir ...`) 100% backward compat.
- mode 매핑 (`first-round` → `first_round`) — slash arg dash 형식이 자연어 / URL slug 컨벤션 정합, JSON 키는 snake_case (mvp-target.json 컨벤션 정합).
- public-safe 마스킹은 Claude 프롬프트 가이드 따름 — 후처리 스크립트 없음, 일관성은 Claude 책임.
- final_round / offer_chat 본문 활성화는 별도 plan — 본 phase 는 4 mode 분기 *준비*만.
