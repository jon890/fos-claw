# Phase 4 — 정적 검증 + push + trailing cleanup

**Model**: sonnet
**Status**: pending

---

## 목표

phase-01/02/03 산출물을 정적 검증으로만 통합 확인. 실제 `claude -p "/study-pack <topic>"` 실행은 *사용자가 본인 환경에서* 별도로 — 부수효과(fos-study commit/push, Discord 알림 발송) 때문. `index.json` status=completed + push + trailing cleanup으로 plan013 마무리.

**범위 외**: 실제 native skill 동작 smoke (사용자 환경 책임), 11 skill 후속 마이그.

## 관련 docs

- `docs/adr.md` ai-nodes ADR-002 — 본 plan 결정 출처.

## 작업 항목

### 1. 통합 정적 검증

```bash
cd /home/bifos/ai-nodes

# 1-A. .claude/skills/ 12 skill 모두 존재 (phase-01 결과)
NEW=$(find career-os/.claude/skills/ -maxdepth 1 -mindepth 1 -type d 2>/dev/null | wc -l)
[ "$NEW" = "12" ] || { echo "PHASE_FAILED: .claude/skills/ skill 수 $NEW (expected 12)"; exit 1; }
echo "[1-A] 12 skill .claude/skills/ OK"

# 1-B. 옛 career-os/skills/ 디렉터리 부재
[ ! -d career-os/skills ] || { echo "PHASE_FAILED: career-os/skills 잔존"; exit 1; }
echo "[1-B] 옛 위치 부재 OK"

# 1-C. 깨진 심링크 0
BROKEN=$(find career-os/.claude/skills/ -maxdepth 1 -mindepth 1 \( -type l ! -exec test -e {} \; -print \) 2>/dev/null | wc -l)
[ "$BROKEN" = "0" ] || { echo "PHASE_FAILED: 깨진 심링크 $BROKEN개"; exit 1; }
echo "[1-C] 깨진 심링크 0 OK"

# 1-D. study-pack-writer SKILL.md 살아있는 명세 (phase-02 결과)
SKILL=career-os/.claude/skills/study-pack-writer/SKILL.md
test -f "$SKILL" || { echo "PHASE_FAILED: study-pack-writer SKILL.md 부재"; exit 1; }

# 필수 섹션
for s in "When to use" "Inputs" "Workflow" "Self-check" "Publish" "Error handling" "References"; do
  grep -q "^## .*$s\|^### .*$s" "$SKILL" \
    || { echo "PHASE_FAILED: SKILL.md 섹션 '$s' 누락"; exit 1; }
done

# 핵심 도구 keyword
for kw in "Read" "Write" "Bash"; do
  grep -q "$kw" "$SKILL" || { echo "PHASE_FAILED: SKILL.md '$kw' keyword 누락"; exit 1; }
done

# self-check 3회 cap
grep -q "최대 3회\|≤3회\|3회 cap" "$SKILL" \
  || { echo "PHASE_FAILED: SKILL.md self-check 3회 cap 누락"; exit 1; }

# 옛 subprocess 잔재 0
grep -q 'claude --print\|claude --output-format' "$SKILL" \
  && { echo "PHASE_FAILED: SKILL.md 옛 subprocess 패턴 잔재"; exit 1; } || true

echo "[1-D] study-pack-writer SKILL.md OK"

# 1-E. scripts/study-pack-writer 폐기 (phase-03 결과)
[ ! -d career-os/scripts/study-pack-writer ] \
  || { echo "PHASE_FAILED: 옛 scripts/study-pack-writer 잔존"; exit 1; }
echo "[1-E] 옛 scripts/study-pack-writer 폐기 OK"

# 1-F. dispatcher study-pack case 0건
HITS=$(grep -E "^\s*study-pack\)" career-os/scripts/command-router/run_now.sh | wc -l)
[ "$HITS" = "0" ] || { echo "PHASE_FAILED: dispatcher study-pack case 잔존"; exit 1; }
echo "[1-F] dispatcher case 제거 OK"
```

### 2. 문법 검증

```bash
cd /home/bifos/ai-nodes

# 2-A. dispatcher bash syntax
bash -n career-os/scripts/command-router/run_now.sh \
  || { echo "PHASE_FAILED: dispatcher bash syntax"; exit 1; }
echo "[2-A] dispatcher syntax OK"

# 2-B. 다른 caller bash syntax (study_pack_publish 호출하는 4개 — plan010-2 후)
for f in $(grep -rln "study_pack_publish" career-os/scripts/ 2>/dev/null | grep '\.sh$'); do
  bash -n "$f" || { echo "PHASE_FAILED: $f bash syntax"; exit 1; }
done
echo "[2-B] study_pack_publish caller bash syntax OK"

# 2-C. tsc 통과 (career-os/scripts/_lib/study_pack_publish.ts 등 유지 헬퍼는 정상 작동 확인)
bunx tsc --noEmit 2>&1 | tee /tmp/plan013-phase04-tsc.log
[ "${PIPESTATUS[0]}" -eq 0 ] || { echo "PHASE_FAILED: tsc"; cat /tmp/plan013-phase04-tsc.log; exit 1; }
echo "[2-C] tsc OK"
```

### 3. docs 정합성 검증

```bash
cd /home/bifos/ai-nodes

# 3-A. flow.md에 native skill 안내
grep -q "native skill\|ADR-002\|claude -p" career-os/docs/flow.md \
  || { echo "PHASE_FAILED: flow.md native skill 안내 누락"; exit 1; }
echo "[3-A] flow.md OK"

# 3-B. AGENTS.md에 plan013 native skill 안내
grep -q "ADR-002\|native skill\|claude -p" career-os/AGENTS.md \
  || { echo "PHASE_FAILED: AGENTS.md native skill 안내 누락"; exit 1; }
echo "[3-B] AGENTS.md OK"

# 3-C. ai-nodes/docs/adr.md ADR-002 존재
grep -q "^## ADR-002 — Claude Code native skill" docs/adr.md \
  || { echo "PHASE_FAILED: ai-nodes ADR-002 누락"; exit 1; }
echo "[3-C] ai-nodes ADR-002 OK"
```

### 4. index.json status=completed 마킹

```bash
cd /home/bifos/ai-nodes
python3 - <<'PY'
import json
from pathlib import Path
p = Path("career-os/tasks/plan013-study-pack-writer-native/index.json")
data = json.loads(p.read_text(encoding="utf-8"))
data["status"] = "completed"
data["current_phase"] = 4
for phase in data["phases"]:
    phase["status"] = "completed"
p.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("[index.json] marked completed")
PY
```

### 5. 최종 commit + push

```bash
cd /home/bifos/ai-nodes
git add career-os/tasks/plan013-study-pack-writer-native/index.json
git commit -m "task(career-os): plan013-study-pack-writer-native 완료 마킹"
git push origin main
```

push 실패 시 `PHASE_FAILED: push (<stderr>)` + `exit 1`.

### 6. trailing cleanup — run-phases.py 후처리

```bash
cd /home/bifos/ai-nodes
if [ -n "$(git status --porcelain career-os/tasks/plan013-study-pack-writer-native/index.json)" ]; then
  python3 -c "
from pathlib import Path
p = Path('career-os/tasks/plan013-study-pack-writer-native/index.json')
text = p.read_text(encoding='utf-8')
if not text.endswith('\n'):
    p.write_text(text + '\n', encoding='utf-8')
"
  git add career-os/tasks/plan013-study-pack-writer-native/index.json
  git commit -m "task(career-os): plan013 index.json commitSha 후기록 + EOL 보정"
  git push origin main
fi

[ -z "$(git status --porcelain career-os/tasks/plan013-study-pack-writer-native/)" ] \
  || { echo "PHASE_FAILED: trailing 후에도 plan013 경로 dirty"; git status --porcelain; exit 1; }
echo "trailing cleanup OK"
```

## Critical Files

| 파일 | 변경 |
|---|---|
| `career-os/tasks/plan013-study-pack-writer-native/index.json` | status 마킹 (in-place) |

다른 파일은 phase-01/02/03 commit. trailing cleanup에서만 index.json 추가.

## 사용자 직접 처리 안내 (phase 외)

phase 종료 후 사용자가 환경에서 수행:

```bash
# 1. 실제 native skill 동작 smoke (선택)
claude -p "/study-pack <test-topic>"

# 2. 정상 동작 확인:
#    - SKILL.md 자동 로드 ✓
#    - sources/fos-study/<outputPath>.md Write ✓
#    - git commit/push 발생 ✓
#    - Discord 채널 [완료] 알림 도달 ✓

# 3. 문제 발생 시 SKILL.md 명세 보강 (별도 plan 또는 직접 Edit)
```

플로우가 깨끗하면 11개 다른 skill 점진 마이그(plan014~) 진행 가능.

## Blocked 조건

**중요 — exit code 명시**: 본문의 모든 검증 bash 블록은 반드시 Bash 도구로 직접 실행. prose로 마커만 출력하면 success로 잘못 처리.

- 검증 1-A ~ 1-F 중 하나 실패 → `PHASE_FAILED: 검증 <항목>` + `exit 1`
- 문법 검증 2-A ~ 2-C 실패 → `PHASE_FAILED: <syntax/tsc>` + `exit 1`
- docs 검증 3-A ~ 3-C 실패 → `PHASE_FAILED: docs <항목>` + `exit 1`
- push 실패 → `PHASE_FAILED: push (<stderr>)` + `exit 1`
- trailing 후에도 dirty → `PHASE_FAILED: trailing 미완` + `exit 1`
- phase-01/02/03 commit 부재 → `PHASE_BLOCKED: 선행 phase 미완` + `exit 2`

## 의도 메모

- 통합 *정적* 검증만 — 실제 `claude -p` 호출은 부수효과(fos-study commit/push + Discord) 때문에 phase에서 회피. 사용자 수동 확인.
- destructive 검증 (옛 잔재 0건 강제) + additive 검증 (새 파일/섹션 존재) 결합 — additive 갱신만으로 통과 못 함 (common-pitfalls 6-5).
- trailing cleanup은 plan001~012에서 매번 발생한 패턴 (common-pitfalls 6-2). 본 phase가 자체 처리.
- 11 skill 후속 마이그는 *플로우가 깨끗하면* 같은 패턴 반복. plan014~019 후보.
