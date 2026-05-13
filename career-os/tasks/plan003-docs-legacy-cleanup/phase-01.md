# Phase 01 — docs-first: ADR-018 + learn/README 재작성 + code-architecture 트리 + AGENTS.md

**Model**: sonnet
**Status**: pending

---

## 목표

후속 phase가 따를 docs/ 운영 정책을 docs에 먼저 박는다. legacy 디렉터리 폐기 결정 + 학습 노트 정책 + 새 디렉터리 트리. 이 phase는 docs만 갱신하고 legacy 파일은 손대지 않는다 (phase-02 책임).

범위 외: decisions/ + audit/ + learn/ legacy 파일의 실제 삭제, prep / hand-off / learn 008 처리.

## 관련 docs (실행 전 읽기)

- `career-os/docs/adr.md` 끝부분 (ADR-015, ADR-016, ADR-017이 이미 누적된 상태 — ADR-017은 plan005가 cj-oliveyoung-java-backend-prep skill 분해로 추가). 본 phase가 ADR-018 추가.
- `career-os/docs/code-architecture.md` 디렉터리 트리 영역 (docs/ 섹션).
- `career-os/docs/learn/README.md` 기존 본문. 본 phase가 재작성.
- `career-os/AGENTS.md` 5문서 라우팅 표.

## 작업 항목

### 1. adr.md 맨 아래에 ADR-018 추가

ADR 작성 원칙(planning/SKILL.md 7단계 "ADR 작성 원칙")에 따라 5섹션만:

```markdown
---

## ADR-018 — docs/ 운영 정책: 휘발성 vs 영속, learn → ADR 흡수 흐름

- Status: Accepted
- Date: 2026-05-13

### 맥락
docs/ 안에 5문서(prd / data-schema / flow / code-architecture / adr) 외에 decisions/ 15 + audit/ 3 + learn/ 8 + hand-off/ 1 + prep/ 2 가 흩어져 있었다. 시간이 지나며:
- decisions/ NNN-*.md 는 adr.md 통합본과 사실상 중복 — 둘 다 편집해야 하나 어디가 단일 출처인지 매번 헷갈림.
- audit/ 3 파일은 4월 일회성 진단 산출물 — 정책상 어디까지 보존할지 미정.
- learn/ 8 파일 중 7개는 이미 5문서·스킬 본체로 흡수됨에도 잔존 → 새 노트가 어디로 들어와야 하는지 매번 결정.
- 새 에이전트가 docs/를 처음 볼 때 "결정·학습이 어디 있는지" 분기가 명확하지 않음.

### 결정
- adr.md 가 의사결정 누적의 단일 출처 (ADR-015 재확인). 개별 ADR 파일 신설 금지.
- learn/ 는 짧은 회고용. 결정·근거가 굳어지면 adr.md 로 흡수하고 learn 파일은 삭제. legacy 노트의 history 는 git log 에 보존.
- hand-off/ 는 외부 위임·인수인계용 일회성 노트. 임무 종료 후 archive 또는 삭제.
- prep/ 는 회사·이벤트별 운영 자산. 이벤트 종료 후 archive.
- decisions/ + audit/ 디렉터리는 폐기. 새 파일 생성 금지. 기존 잔존은 plan003 phase-02 에서 일괄 git rm.

### 결과
- docs/ = 5문서 + learn/{현행} + hand-off/{현행} + prep/{현행} 4 영역으로 축소.
- 새 노트 라우팅이 명확: 결정이면 adr.md, 회고면 learn/, 외부 위임이면 hand-off/, 이벤트 준비면 prep/.
- legacy 잔존 drift 위험 제거 — 편집해야 할 단일 출처가 항상 명확.

### 적용
- learn/README.md 가 학습 노트 정책의 가이드 (어떤 게 learn 에 들어오고 어떤 게 ADR 로 가는지).
- code-architecture.md 디렉터리 트리에서 decisions/ + audit/ 항목 제거.
- AGENTS.md 5문서 라우팅 표의 ADR 카운트 갱신.
```

### 2. learn/README.md 재작성

기존 README는 "Discord notification routing 같은 운영 명령 인덱스" 성격이었다 — 그 운영 정보는 이미 ADR-008 + flow.md 로 흡수됐으므로 사라질 운명. 새 README는 학습 노트 정책 가이드로:

```markdown
# Learn Index

career-os 운영·실험·실패에서 얻은 짧은 회고를 누적하는 디렉터리. 결정이 굳어지면 docs/adr.md 로 흡수되고 learn 파일은 삭제된다.

## 언제 learn 에 적는가

learn 노트는 다음 성격일 때 적당하다.

- 운영 중 발견한 사소하지만 재현 가능한 함정
- 시도해 봤지만 채택하지 않은 대안 (가벼운 회고)
- 결정 직전 단계의 사고 흐름 (아직 ADR 로 굳지 않은)
- 외부 의존성·도구 사용 시 알아둘 점

다음은 learn 이 아닌 다른 곳에 적는다.

- 채택된 결정 → `docs/adr.md` 맨 아래에 ADR 형식으로
- 새 워크플로 / 명세 / 스키마 → 5문서 중 해당 문서
- 외부 위임·인수인계 → `docs/hand-off/`
- 회사·이벤트별 일회성 준비 → `docs/prep/`

## 파일명 규칙

`NNN-topic-name.md` (3자리 번호 + kebab-case). 다음 가용 번호:

```bash
ls career-os/docs/learn/ | grep -oE '^[0-9]+' | sort -n | tail -1
```

## 문서 구조

각 learn 파일은 다음 셋을 짧게 적는다.

1. 문제 상황 또는 시도
2. 결론
3. 언제 이 문서를 다시 읽어야 하는지

길이는 1 페이지 이하 목표. 더 길어지면 ADR 로 흡수할 시점.

## 흡수 + 삭제 흐름

learn 노트가 ADR 로 흡수될 때:

1. adr.md 에 새 ADR 추가 — learn 노트의 결정 부분이 흡수됨.
2. learn 파일 삭제 — git rm. history 는 git log 로 추적 가능.
3. 다른 곳(AGENTS.md / hand-off / 다른 learn) 에서 그 learn 파일을 참조하면 ADR 번호 링크로 교체.

이 흐름은 ADR-018 에 명문화. 어기면 docs drift.

## 현행 learn 노트

- `008-docs-audit-quality-loop.md` — docs-audit 스킬 운영 회고. 향후 fos-study 측 docs-audit SKILL.md 로 흡수 예정 (별도 plan).

(plan003 phase-02 시점에 001-007 은 모두 5문서·스킬 본체로 흡수 후 삭제됨.)
```

### 3. code-architecture.md 디렉터리 트리 갱신

현재 트리에는 다음이 있을 것:

```
├── docs/                                  ← 5 종합 문서 (fos-blog 패턴)
│   ├── prd.md            ...
│   ├── data-schema.md    ...
│   ├── flow.md           ...
│   ├── code-architecture.md  이 문서
│   ├── adr.md            ...
│   ├── decisions/        (legacy) 개별 ADR 파일들 — adr.md로 통합 후 archive 예정
│   ├── hand-off/         타 에이전트/사람에게 넘기는 인수인계 메모
│   ├── prep/             회사별·이벤트별 준비 노트
│   ├── learn/            세션·실험 회고
│   └── audit/            (legacy) 과거 docs-audit 출력
```

→ 다음으로 교체:

```
├── docs/                                  ← 5 종합 문서 + 보조 영역
│   ├── prd.md            제품 범위·MVP·기능 목록
│   ├── data-schema.md    config/logs/runtime 스키마
│   ├── flow.md           사용자/데이터 플로우
│   ├── code-architecture.md  이 문서
│   ├── adr.md            모든 아키텍처 결정 누적 (단일 출처, ADR-015/017)
│   ├── learn/            짧은 회고. 결정 굳어지면 adr.md 로 흡수 후 삭제 (ADR-018)
│   ├── hand-off/         외부 위임·인수인계 일회성 노트
│   └── prep/             회사·이벤트별 운영 자산. 이벤트 종료 후 archive
```

decisions/ + audit/ 항목은 트리에서 완전히 제거. ADR-015 가 이미 "legacy 보존만"이라 했으나 ADR-018 이 폐기로 더 명확하게.

### 4. AGENTS.md 5문서 라우팅 표 갱신

현 시점 AGENTS.md 5문서 라우팅 표에는 `ADR-001~015` (plan003 작성 시점 실측)가 박혀 있다 — plan002의 ADR-016, plan005의 ADR-017이 추가됐는데도 카운트는 갱신 누락. ADR-018 까지 한 번에 갱신:

```bash
# 위치 확인
grep -n "ADR-001\|ADR-015\|ADR-016\|ADR-017" career-os/AGENTS.md
```

해당 줄들에서 "ADR-001~015" 또는 유사 표현을 "ADR-001~018" 로 교체.

decisions/ 디렉터리 언급이 AGENTS.md 의 5문서 라우팅 또는 다른 섹션에 prose 로 들어 있으면, ADR-018 폐기 결정에 맞춰 그 prose 도 갱신 (또는 제거).

## Critical Files

| 파일 | 변경 |
|---|---|
| `career-os/docs/adr.md` | ADR-018 맨 아래 추가 |
| `career-os/docs/learn/README.md` | 학습 정책 가이드로 재작성 |
| `career-os/docs/code-architecture.md` | docs/ 트리에서 decisions/ + audit/ 제거 |
| `career-os/AGENTS.md` | ADR 카운트 갱신, decisions/ prose 정리 |

phase-01 은 위 4개 파일만 만진다. legacy 파일 삭제는 phase-02.

## 검증

```bash
cd /home/bifos/ai-nodes

# 1. ADR-018 추가됐는지
grep -c "^## ADR-018" career-os/docs/adr.md
# 기대값: 1

# 2. ADR 헤더 총 18 (plan003 시작 시점 ~ 19 (ADR-018 추가 후) 범위
#    내역: ADR-001~006 (6) + ADR-007a + ADR-007b (2) + ADR-008~017 (10) = 18, + ADR-018 = 19.
#    007 충돌은 plan003 범위 외라 그대로.
count=$(grep -c "^## ADR-" career-os/docs/adr.md)
[[ $count -ge 18 && $count -le 19 ]] || { echo "PHASE_FAILED: ADR 카운트 $count, expected 18-19"; exit 1; }

# 3. learn/README.md 본문에 "흡수" / "삭제 흐름" 등장 (새 정책 가이드 형태인지)
grep -c "흡수\|삭제 흐름" career-os/docs/learn/README.md
# 기대값: 1 이상

# 4. code-architecture.md 디렉터리 트리에서 decisions/ + audit/ 항목 제거
grep -c "├── audit/\|├── decisions/" career-os/docs/code-architecture.md
# 기대값: 0

# 5. AGENTS.md ADR 카운트 갱신
grep -c "ADR-018\|ADR-001~017" career-os/AGENTS.md
# 기대값: 1 이상 (또는 본문 갱신 방식에 따라 갱신 확인 가능한 패턴)

# 6. legacy 파일은 손대지 않음
git diff --stat career-os/docs/decisions/ career-os/docs/audit/ career-os/docs/learn/[0-9]*.md 2>/dev/null | head
# 기대값: 빈 출력 (변경 없음)
```

위 6개 모두 통과해야 success. 실패 시 `PHASE_FAILED: 검증 N` 출력 + non-zero exit.

## 커밋

```
docs(career-os): plan003 docs/ 운영 정책 + ADR-018 + learn/README 재작성

phase-02 가 따를 legacy cleanup 정책을 docs 에 먼저 박는다 (docs-first).

- adr.md ADR-018: docs/ 운영 정책 명문화. legacy decisions/ + audit/ 폐기 확정. learn → ADR 흡수 + 삭제 흐름. prep / hand-off 의 이벤트·임무 종료 시 archive 정책.
- learn/README.md 재작성: 학습 정책 가이드. 어떤 게 learn 에 들어오고 어떤 게 ADR 로 가는지.
- code-architecture.md 디렉터리 트리: decisions/ + audit/ 항목 제거.
- AGENTS.md: ADR 카운트 갱신.

legacy 파일 실제 삭제는 phase-02.
```

push 는 phase-03 에서.

## 의도 메모

- docs-first 커밋 — phase-02 실패해도 docs 정책은 main 에 남아 다음 사이클이 재시도 가능.
- ADR-018 이 phase-02 의 *근거* — phase-02 본문이 ADR-018 을 가리키면 자기완결.

## Blocked 조건

**중요 — exit code 명시**: 아래 어느 마커든 출력만 하지 말고 반드시 `sys.exit(1)` (FAILED) 또는 `sys.exit(2)` (BLOCKED) — shell에서는 `exit 1` / `exit 2` — 비-0 exit code로 종료한다. 마커만 출력하고 정상 종료하면 `run-phases.py`가 success로 잘못 처리한다 (plan001-adr-cleanup 1차 실행 사례).

- 위 4개 docs 중 하나라도 부재 시 `PHASE_BLOCKED: docs 누락 (path)` + `exit 2`.
- 검증 1-6 중 하나라도 실패 시 `PHASE_FAILED: 검증 N` + `exit 1`.
