# Data Schema — health-care

## Public config

`config/`에는 외부에 공개되어도 괜찮은 비식별 정책과 일반화된 플랜만 둔다.

### `config/public-health-care-policy.md`

- 공개 가능/금지 정보 경계
- 커밋 전 사용자 확인 기준
- 플랫폼 ID와 의료 원본 정보 비공개 원칙

### `config/knee-running-recovery-plan.md`

- 슬개골 불안정감 이후 달리기 복귀까지의 일반 단계
- 공통 중단 기준
- 단계별 운동/주의사항

## Private data

`data/conditions/<track>/`는 민감정보 저장 영역이며 gitignore 대상이다.

권장 파일:

- `current-context.md` — 현재 요약. 확정 사실/사용자 보고/OCR 불확실성을 구분한다.
- `clinic-records-ocr-YYYY-MM-DD.md` — OCR 기반 정리. 원본 확인 필요 표시를 유지한다.
- `progress-log.jsonl` — 날짜별 증상/운동/다음날 반응 누적.
- `daily-checkins/YYYY-MM-DD.md` — cron이 생성한 일일 안내 보존이 필요할 때만 사용.
- `weekly-summaries/YYYY-MM-DD.md` — 병원/주간 요약 초안.

### `progress-log.jsonl` 권장 스키마

각 줄은 JSON 객체다.

- `date`: `YYYY-MM-DD`
- `pain`: 문자열 또는 null
- `instability`: 문자열 또는 null
- `swelling_heat`: 문자열 또는 null
- `range_of_motion`: 문자열 또는 null
- `walking_stairs`: 문자열 또는 null
- `actions`: 문자열 배열
- `next_day_reaction`: 문자열 또는 null
- `red_flags`: 문자열 배열
- `source`: `user_report` 등 출처
- `created_at`: ISO-8601

민감정보이므로 `data/` 밖으로 복사하지 않는다.
