# Phase 4 — 중간 5 runner TS 마이그 (recommend-topics / replenish-topics / foodville-coffeechat / master / question-bank)

## 목표

도메인 복잡도 중간인 5개 .sh runner를 .ts로. phase-03과 동일 패턴 — boilerplate 제거 + 프롬프트 분리 + dispatcher 연결.

대상:
- `scripts/study-topic-recommender/run_topic_recommendation.sh` → `.ts`
- `scripts/topic-pool-replenisher/run_topic_replenishment.sh` → `.ts`
- `scripts/cj-foodville-coffeechat-prep/run_foodville_coffeechat_prep.sh` → `.ts`
- `scripts/interview-master-writer/run_master.sh` → `.ts`
- `scripts/experience-question-bank-writer/run_question_bank.sh` → `.ts`

## 의존성 / 가정

- phase-03 완료. 4 runner 이미 TS, 패턴 정착.
- plan010 phase-02 결과(build_prompt.ts), phase-03 결과(study_pack_publish.ts) 활성.

## 작업

### 1. 5개 .ts runner 신설

phase-03 패턴 따라:
- shebang `#!/usr/bin/env bun` + 실행 권한.
- boilerplate import(_shared/lib/workspace.ts).
- heredoc → references/*-prompt.md + build_prompt.ts.
- Claude 호출은 invoke_claude_skills.ts.
- question-bank / master는 fos-study commit/push 흐름 — `_shared/lib/fos_study_git.ts`(plan010 phase-04 결과) 사용.

`run_topic_recommendation.ts`는 Claude 호출 없이 inventory 갱신 + scoring(refresh_topic_inventory.py 호출). Python helper들은 별도 plan에서 TS 마이그.

`run_topic_replenishment.ts`는 plan008 phase-03에서 만든 `replenish_topic_reservoir.ts`를 호출하는 thin wrapper일 수 있음 — 사용자 의도 "thin wrapper만"에 부합.

### 2. dispatcher.ts case 연결

해당 5 case의 path를 새 .ts로 갱신.

### 3. 옛 .sh git rm + 실행 권한

### 4. coffeechat skill의 회사명 처리

plan010 phase-01이 coffeechat runner의 회사명 박힘을 mvp-target.json 의존으로 전환했음. 본 phase에서 .ts 마이그 시 그 의존을 보존. `run_foodville_coffeechat_prep.ts`는 mvp-target에서 회사명·산업 컨텍스트를 읽어 프롬프트 placeholder에 주입.

## 검증 명령

```bash
# 1. 5 .ts runner 존재 + shebang + syntax
for f in career-os/scripts/study-topic-recommender/run_topic_recommendation.ts \
         career-os/scripts/topic-pool-replenisher/run_topic_replenishment.ts \
         career-os/scripts/cj-foodville-coffeechat-prep/run_foodville_coffeechat_prep.ts \
         career-os/scripts/interview-master-writer/run_master.ts \
         career-os/scripts/experience-question-bank-writer/run_question_bank.ts; do
  test -f "$f" && test -x "$f"
  head -1 "$f" | grep -q '#!/usr/bin/env bun' || { echo "PHASE_FAILED: $f shebang"; exit 1; }
  bun --no-install build --target=bun "$f" --outdir=/tmp/plan011 >/dev/null 2>&1 \
    || { echo "PHASE_FAILED: $f syntax"; exit 1; }
done

# 2. 옛 .sh 제거됨
for f in run_topic_recommendation.sh run_topic_replenishment.sh \
         run_foodville_coffeechat_prep.sh run_master.sh run_question_bank.sh; do
  HITS=$(find career-os/scripts -name "$f" 2>/dev/null | wc -l)
  [ "$HITS" = "0" ] || { echo "PHASE_FAILED: $f 잔재"; exit 1; }
done

# 3. dispatcher.ts에 5 case 갱신
for cmd in recommend-topics replenish-topics foodville-coffeechat master question-bank; do
  grep -qE "['\"]$cmd['\"].*\\.ts|\\.ts.*['\"]$cmd['\"]" career-os/lib/dispatcher.ts \
    || grep -q "$cmd" career-os/lib/dispatcher.ts \
    || { echo "PHASE_FAILED: dispatcher.ts에 $cmd 누락"; exit 1; }
done

# 4. coffeechat runner의 회사명 처리 — mvp-target 의존
grep -qE 'mvp-target|target-context' career-os/scripts/cj-foodville-coffeechat-prep/run_foodville_coffeechat_prep.ts
[ "$(grep -cE 'CJ푸드빌|푸드빌|foodville' career-os/scripts/cj-foodville-coffeechat-prep/run_foodville_coffeechat_prep.ts)" = "0" ]
```

검증 실패 시 `echo 'PHASE_FAILED: <식>' && exit 1`.

## 커밋

```
refactor(career-os): 중간 5 runner TS 마이그 (recommend-topics 등)

- 5 .sh → .ts
- coffeechat runner 회사명 mvp-target 의존 보존 (plan010 phase-01과 일관)
- thin wrapper 패턴 (replenish-topics 등)
- dispatcher.ts 5 case 연결
```

## 범위 외

- 무거운 5 runner(phase-05).
- track_task.ts(phase-06).
