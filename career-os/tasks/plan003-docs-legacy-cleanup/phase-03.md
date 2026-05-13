# Phase 03 — 통합 smoke + 잔존 참조 검증 + index.json status=completed + push

**Model**: haiku
**Status**: pending

---

## 목표

phase-01 / phase-02 산출물을 통합 검증하고 `index.json` status=completed 마킹 후 push. 사용자가 깨끗한 한 사이클 결과를 다음 작업에서 바로 신뢰할 수 있도록 마무리.

범위 외: 새 작업 추가, plan004 시작, 008 fos-study PR.

## 관련 docs

- `career-os/docs/adr.md` 맨 아래 ADR-018 (phase-01 산출물).
- `career-os/docs/learn/README.md` (phase-01 재작성본).
- `career-os/tasks/plan003-docs-legacy-cleanup/index.json` — status 마킹 대상.

## 작업 항목

### 1. 디렉터리 트리 최종 확인

```bash
cd /home/bifos/ai-nodes

# 1-1. legacy 디렉터리 없음
[ ! -d career-os/docs/decisions ] || { echo "PHASE_FAILED: decisions/ 잔존"; exit 1; }
[ ! -d career-os/docs/audit ] || { echo "PHASE_FAILED: audit/ 잔존"; exit 1; }

# 1-2. docs/ 최상위 = 5문서 (md 5개) 정확
ls -1 career-os/docs/*.md | wc -l
top_count=$(ls -1 career-os/docs/*.md 2>/dev/null | wc -l)
[ "$top_count" -eq 5 ] || { echo "PHASE_FAILED: docs/ 최상위 md $top_count개 (5 기대)"; exit 1; }

# 1-3. learn/ 안 = 008 한 개 + README.md
ls -1 career-os/docs/learn/ | sort > /tmp/plan003-learn-actual.txt
cat <<EOF > /tmp/plan003-learn-expected.txt
008-docs-audit-quality-loop.md
README.md
EOF
diff /tmp/plan003-learn-actual.txt /tmp/plan003-learn-expected.txt || { echo "PHASE_FAILED: learn/ 내용 mismatch"; exit 1; }

# 1-4. hand-off/ + prep/ 보존 확인 (수 변화 없어야)
[ -f career-os/docs/hand-off/2026-04-25-morning-topic-recommendation-improvement-brief.md ] || { echo "PHASE_FAILED: hand-off 누락"; exit 1; }
[ -f career-os/docs/prep/cj-foodville-coffeechat-strategy.md ] || { echo "PHASE_FAILED: prep strategy 누락"; exit 1; }
[ -f career-os/docs/prep/cj-foodville-coffeechat-30min-final-checklist.md ] || { echo "PHASE_FAILED: prep checklist 누락"; exit 1; }
```

### 2. 잔존 참조 검증 (drift 차단)

```bash
cd /home/bifos/ai-nodes

# 2-1. docs/decisions/ prose 잔존 0건
count=$(grep -rln "docs/decisions/" career-os/ --include='*.md' --include='*.sh' --include='*.py' 2>/dev/null | grep -v "sources/fos-study" | wc -l)
[ "$count" -eq 0 ] || { echo "PHASE_FAILED: docs/decisions/ 참조 $count건 잔존"; grep -rln "docs/decisions/" career-os/ --include='*.md' --include='*.sh' --include='*.py' | grep -v "sources/fos-study"; exit 1; }

# 2-2. docs/audit/ 잔존 0건
count=$(grep -rln "docs/audit/" career-os/ --include='*.md' --include='*.sh' --include='*.py' 2>/dev/null | grep -v "sources/fos-study" | wc -l)
[ "$count" -eq 0 ] || { echo "PHASE_FAILED: docs/audit/ 참조 $count건 잔존"; exit 1; }

# 2-3. 옛 learn 7개 직접 링크 잔존 0건
for old in 001-discord-notification-routing 002-fos-study-git-sequencing 003-agent-skill-direction-for-study-pack 004-fos-openclaw-and-fos-study-split 005-next-step-for-fos-openclaw-source-of-truth 006-fos-openclaw-target-tree 007-today-status-and-settled-directions; do
  count=$(grep -rln "$old\.md" career-os/ --include='*.md' 2>/dev/null | grep -v "sources/fos-study" | wc -l)
  [ "$count" -eq 0 ] || { echo "PHASE_FAILED: $old.md 참조 잔존"; exit 1; }
done
```

### 3. 5문서 valid markdown 형태 (간단)

```bash
cd /home/bifos/ai-nodes

# 5문서 모두 첫 줄이 # 헤더로 시작
for f in career-os/docs/prd.md career-os/docs/data-schema.md career-os/docs/flow.md career-os/docs/code-architecture.md career-os/docs/adr.md; do
  first=$(head -1 "$f")
  [[ "$first" == "# "* ]] || { echo "PHASE_FAILED: $f 첫 줄 헤더 아님"; exit 1; }
done

# adr.md ADR 헤더 19개 (ADR-001~006 + 007a + 007b + 008~018 = 19). 007 충돌은 plan003 범위 외.
count=$(grep -c "^## ADR-" career-os/docs/adr.md)
[ "$count" -ge 19 ] || { echo "PHASE_FAILED: adr.md ADR 헤더 $count, expected 19+"; exit 1; }

# ADR-018 명시적 존재
[ "$(grep -c '^## ADR-018' career-os/docs/adr.md)" -ge 1 ] || { echo "PHASE_FAILED: ADR-018 누락"; exit 1; }
```

### 4. index.json status=completed 마킹

```bash
cd /home/bifos/ai-nodes
python3 - <<'PY'
import json
from pathlib import Path
p = Path("career-os/tasks/plan003-docs-legacy-cleanup/index.json")
data = json.loads(p.read_text(encoding="utf-8"))
data["status"] = "completed"
data["current_phase"] = 3
for phase in data["phases"]:
    phase["status"] = "completed"
p.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("[index.json] marked completed")
PY
```

### 5. 최종 커밋 + push

```bash
cd /home/bifos/ai-nodes
git add career-os/tasks/plan003-docs-legacy-cleanup/index.json
git commit -m "task(career-os): plan003-docs-legacy-cleanup 완료 마킹"
git push origin main
```

push 실패 시 `PHASE_FAILED: push 실패 (<stderr>)` 출력 + non-zero exit.

## Critical Files

| 파일 | 변경 |
|---|---|
| `career-os/tasks/plan003-docs-legacy-cleanup/index.json` | status 마킹 (in-place) |

다른 파일은 손대지 않는다. 모든 변경은 phase-01 + phase-02 가 이미 commit 한 상태.

## 검증

위 작업 1-3번이 검증 자체. 추가 smoke:

```bash
cd /home/bifos/ai-nodes
python3 - <<'PY'
import json
data = json.load(open("career-os/tasks/plan003-docs-legacy-cleanup/index.json"))
assert data["status"] == "completed"
for p in data["phases"]:
    assert p["status"] == "completed", f"phase {p['number']} status={p['status']}"
print("all phases completed")
PY
```

## 의도 메모

- haiku 모델 — 검증 + cleanup 위주, 큰 추론 불필요.
- 통합 smoke 가 plan003 의 안전망. 잔존 참조 1건이라도 남으면 drift 시작.

## Blocked 조건

**중요 — exit code 명시**: 아래 어느 마커든 출력만 하지 말고 반드시 `sys.exit(1)` (FAILED) 또는 `sys.exit(2)` (BLOCKED) — shell에서는 `exit 1` / `exit 2` — 비-0 exit code로 종료한다. 마커만 출력하고 정상 종료하면 `run-phases.py`가 success로 잘못 처리한다 (plan001-adr-cleanup 1차 실행 사례).

- 디렉터리 트리 mismatch → `PHASE_FAILED: 디렉터리 N` + `exit 1`.
- 잔존 참조 0이 아님 → `PHASE_FAILED: 잔존 참조 N` + `exit 1`.
- push 권한 없음 → `PHASE_BLOCKED: push 권한` + `exit 2`.
