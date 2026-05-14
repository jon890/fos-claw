# Phase 5 — 무거운 5 runner TS 마이그 (study-pack / maintain-study-pack / bootcamp-batch / live-coding-dispatch / auto-question-bank)

## 목표

study-pack 계열 5개 .sh runner를 .ts로. 본 phase는 plan010 phase-03의 `_shared/lib/study_pack_publish.ts` 활용 — 5 runner가 thin wrapper로 축소(사용자 의도).

대상:
- `scripts/study-pack-writer/run_study_pack.sh` → `.ts`
- `scripts/study-pack-maintainer/run_maintainer.sh` → `.ts`
- `scripts/study-pack-batch/run_bootcamp_batch.sh` → `.ts`
- `scripts/study-topic-recommender/run_live_coding_dispatch.sh` → `.ts`
- `scripts/experience-question-bank-writer/run_question_bank_auto.sh` → `.ts`

## 의존성 / 가정

- phase-04 완료. 9 runner 이미 TS.
- plan010 phase-03(`_shared/lib/study_pack_publish.ts`) + phase-04(`_shared/lib/fos_study_git.ts`) 활성.

## 작업

### 1. 5개 .ts runner를 thin wrapper로 신설

각 runner는 study_pack_publish.ts(또는 question_bank_publish.ts) 호출 + 도메인 특성만 명시:

- `run_study_pack.ts` — topic key 검증 + study_pack_publish 호출(VALIDATOR_KIND='study_pack').
- `run_maintainer.ts` — 기존 fos-study 문서 읽기 + maintainer 프롬프트 컨텍스트 추가 + study_pack_publish 호출.
- `run_bootcamp_batch.ts` — 큐 추출 + 각 topic마다 study_pack_publish 위임 + bootcamp-summary.md.
- `run_live_coding_dispatch.ts` — seed 선택 + TOPIC_CONFIG_OVERRIDE + study_pack_publish 호출.
- `run_question_bank_auto.ts` — 기본 topic + question_bank 흐름 위임.

목표 줄 수 ≤ 60 (plan010 phase-03 검증과 동일 기준 — 본 plan은 그 검증을 .ts에서 재확인).

### 2. dispatcher.ts case 연결 + 옛 .sh git rm

### 3. references/*-prompt.md placeholder 일관성 확인

5 runner가 사용하는 프롬프트 references가 `{{primary.company}}` / `{{role}}` 같은 placeholder를 사용하는지 확인(plan010 phase-02 결과 의존). 누락이 있다면 본 phase에서 추가.

## 검증 명령

```bash
# 1. 5 .ts runner 존재 + shebang + thin wrapper 줄 수 ≤60
for f in career-os/scripts/study-pack-writer/run_study_pack.ts \
         career-os/scripts/study-pack-maintainer/run_maintainer.ts \
         career-os/scripts/study-pack-batch/run_bootcamp_batch.ts \
         career-os/scripts/study-topic-recommender/run_live_coding_dispatch.ts \
         career-os/scripts/experience-question-bank-writer/run_question_bank_auto.ts; do
  test -f "$f" && test -x "$f"
  head -1 "$f" | grep -q '#!/usr/bin/env bun'
  L=$(wc -l < "$f")
  [ "$L" -le 60 ] || { echo "PHASE_FAILED: $f $L lines > 60 (thin wrapper 위반)"; exit 1; }
  bun --no-install build --target=bun "$f" --outdir=/tmp/plan011 >/dev/null 2>&1
done

# 2. study_pack_publish.ts(또는 question_bank) 호출 확인
for f in career-os/scripts/study-pack-writer/run_study_pack.ts \
         career-os/scripts/study-pack-maintainer/run_maintainer.ts \
         career-os/scripts/study-pack-batch/run_bootcamp_batch.ts \
         career-os/scripts/study-topic-recommender/run_live_coding_dispatch.ts; do
  grep -qE 'study_pack_publish|question_bank_publish' "$f" \
    || { echo "PHASE_FAILED: $f publish 헬퍼 미호출"; exit 1; }
done

# 3. 옛 .sh 제거됨
for f in run_study_pack.sh run_maintainer.sh run_bootcamp_batch.sh \
         run_live_coding_dispatch.sh run_question_bank_auto.sh; do
  HITS=$(find career-os/scripts -name "$f" 2>/dev/null | wc -l)
  [ "$HITS" = "0" ] || { echo "PHASE_FAILED: $f 잔재"; exit 1; }
done

# 4. dispatcher.ts 5 case 갱신
for cmd in study-pack maintain-study-pack bootcamp-batch live-coding-dispatch auto-question-bank; do
  grep -q "$cmd" career-os/lib/dispatcher.ts || { echo "PHASE_FAILED: dispatcher.ts에 $cmd 누락"; exit 1; }
done
```

검증 실패 시 `echo 'PHASE_FAILED: <식>' && exit 1`.

## 커밋

```
refactor(career-os): 무거운 5 runner TS 마이그 (study-pack 계열 + question-bank-auto)

- 5 .sh → .ts (목표 thin wrapper ≤60 lines)
- _shared/lib/study_pack_publish.ts(plan010) 위임
- _shared/lib/fos_study_git.ts(plan010) 활용
- dispatcher.ts 5 case 연결
```

## 범위 외

- track_task.ts(phase-06).
- 옛 .sh 폴더(scripts/<skill>/) 자체 cleanup(phase-07).
