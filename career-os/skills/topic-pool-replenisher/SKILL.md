# topic-pool-replenisher

name: topic-pool-replenisher
description: "study-pack candidate reservoir 자동 보충 + primary auto-promotion(ADR-011). Claude subprocess를 직접 호출해 후보 토픽을 생성, 로컬 validator로 key/domain/tag/outputPath/prompt 검증 후 `config/topics.json`의 study-pack-candidates namespace에 append. 부족 시 candidate 일부를 primary로 promote."

## 산출물

- `config/topics.json` 갱신 (study-pack-candidates namespace append, 필요 시 primary promote)
- `data/runtime/topic-replenishment.json` 실행 요약

## 관련 ADR

- ADR-011: candidate reservoir + auto-promotion 정책
- ADR-014: topics.json 통합 스키마
- ADR-017: skill 분해 계획 (이 skill은 4번째 단계)

## 진입점

```bash
career-os/skills/topic-pool-replenisher/scripts/run_topic_replenishment.sh
```

dispatcher를 통해 실행:

```bash
career-os/skills/command-router/scripts/run_now.sh replenish-topics
```
