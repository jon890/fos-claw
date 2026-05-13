# ADR-014: 자체 extractor/renderer에 usage 파일 전파 패턴 통일 (토큰·비용 회계 복구)

- Status: Proposed (사용자 검토 후 Accepted 승격 예정)
- Related: [ADR-007b](007-study-pack-stdout-capture.md) (Write 도구 회피 결정은 유효, 출력 포맷 결정은 사실상 무효화됨)

## 맥락

`logs/task-runs.jsonl` 162행을 실측한 결과 — `tokens_in_delta` / `tokens_out_delta` / `cost_usd` / `model` 4개 필드가 채워진 entry는 `baseline` / `daily` 3건뿐. 그 외 모든 runner(study-pack 80+건, master, question-bank, maintain-study-pack, position-recommendation 22건, foodville-coffeechat, recommend-positions 등)는 4개 필드 전부 `null`.

처음 추정한 가설은 "ADR-007b의 stdout 캡처 전환이 JSON 모드를 폐기하면서 usage 회계가 사라졌다"였으나, 실제 코드를 확인한 결과 가설은 **틀렸다**.

확정된 진실:

1. 8개 runner 중 6개가 이미 `claude --print --output-format json`을 쓰고 있다. ADR-007b 패턴은 study-pack 일부 시점에만 적용됐고 그 이후 다시 JSON 모드로 돌아왔다.
2. **회계 누락의 진짜 원인은 *자체 extractor/renderer가 usage 필드 전파 패턴을 구현하지 않은 것***이다.

각 runner와 그 extractor를 정리하면:

| Runner | Extractor / Renderer | usage 인자 받음 | usage write 구현 |
|---|---|---|---|
| `run_baseline.sh` / `run_daily.sh` / `run_smoke_test.sh` | `_shared/bin/extract_claude_result.py` | 받음 | 있음 (gold) |
| `run_study_pack.sh` | `skills/study-pack-writer/scripts/extract_and_validate_study_pack.py` | **없음** | 없음 |
| `run_master.sh` | 위 study-pack extractor 공유 사용 | **없음** | 없음 |
| `run_question_bank.sh` | `skills/experience-question-bank-writer/scripts/render_question_bank.py` | **없음** | 없음 |
| `run_position_recommendation.sh` | `skills/position-recommender/scripts/extract_position_report.py` | **없음** | 없음 |
| `run_maintainer.sh` | 인라인 `python3 - <<PY`로 파싱, 별도 extractor 파일 없음 | n/a | 없음 |
| `run_foodville_coffeechat_prep.sh` | `_shared/bin/extract_claude_result.py` | (caller가 인자 전달 누락) | **있으나 caller가 미사용** |
| `run_morning_topic_recommendation.sh` | `refresh_topic_inventory.py`(Claude 호출 없음) | n/a | n/a |
| `run_replenish_topic_reservoir.sh` | `replenish_topic_reservoir.py`(Python에서 직접 `subprocess.run(["claude", ...])`) | n/a (Python 내부) | 없음 |

영향:

- `career-os/CLAUDE.md`의 "Token / Cost Discipline" 조항이 측정 불가능한 정책이 되었다.
- `skills/workspace-audit`의 `health.token_outlier` 검사가 baseline / daily 두 태스크에만 적용된다.
- 어떤 토픽 generation이 평균보다 몇 배 더 토큰을 쓰는지, 어느 시기에 모델이 어떻게 라우팅됐는지 추적할 단일 출처가 사라졌다.

## 결정

자체 extractor/renderer 본체에 usage 인자 책임을 부과하지 않는다. 대신 **사이드 헬퍼**로 분리한다. 자체 extractor는 마크다운 추출·검증이라는 단일 책임만 유지한다.

신설: `_shared/bin/claude_lib.sh` — sourceable shell 라이브러리. 첫 함수 `claude_persist_usage <raw-json-path>` — `TRACK_TASK_CLAUDE_USAGE_FILE` env가 설정돼 있으면 raw Claude JSON envelope을 그 경로로 cp한다. env가 비어 있으면 no-op.

각 runner는 자체 extractor 호출 직후 한 줄로 헬퍼 호출:

```bash
# Before (foodville-coffeechat)
python3 "$EXTRACTOR" "$RAW_RESULT_JSON" "$REPORT_MD"

# After
source "$HOME/ai-nodes/_shared/bin/claude_lib.sh"
python3 "$EXTRACTOR" "$RAW_RESULT_JSON" "$REPORT_MD"
claude_persist_usage "$RAW_RESULT_JSON"
```

Python에서 직접 `subprocess.run(["claude", ...])` 호출하는 케이스(`replenish_topic_reservoir.py` 등)는 동일 정책을 Python 인라인으로 적용한다 — Claude JSON 받은 직후 `os.environ.get("TRACK_TASK_CLAUDE_USAGE_FILE")`로 경로를 받아 그 파일에 쓴다.

기존 `_shared/bin/extract_claude_result.py`의 옵셔널 usage 인자(`<usage-json>`)는 backwards compat을 위해 유지하되, 신규 코드는 위 헬퍼 호출 패턴을 선호한다.

## 적용 대상

신규:
- `_shared/bin/claude_lib.sh` — `claude_persist_usage` 함수 정의.

Runner 보정 (각 runner에서 `claude_lib.sh` source + 자체 extractor 호출 직후 `claude_persist_usage "$RAW_RESULT_JSON"` 한 줄 추가):
- `skills/study-pack-writer/scripts/run_study_pack.sh`
- `skills/interview-master-writer/scripts/run_master.sh`
- `skills/experience-question-bank-writer/scripts/run_question_bank.sh`
- `skills/position-recommender/scripts/run_position_recommendation.sh`
- `skills/cj-foodville-coffeechat-prep/scripts/run_foodville_coffeechat_prep.sh`
- `skills/study-pack-maintainer/scripts/run_maintainer.sh`

Python에서 claude 직접 호출:
- `skills/cj-oliveyoung-java-backend-prep/scripts/replenish_topic_reservoir.py` — `TRACK_TASK_CLAUDE_USAGE_FILE` env 처리 추가.

자체 extractor/renderer 본체는 **수정 없음**. 마크다운 추출·검증 단일 책임 유지.

수정 불필요:
- `skills/cj-oliveyoung-java-backend-prep/scripts/refresh_topic_inventory.py` (Claude 호출 없음)
- `_shared/bin/extract_claude_result.py` (이미 패턴 구현, gold standard)

## 결과

- 모든 Claude 호출 runner의 토큰 회계가 `track_task.sh`로 흘러 들어간다.
- `logs/task-runs.jsonl`의 `tokens_*`, `cost_usd`, `model` 필드가 의미 있는 값을 갖는다.
- CLAUDE.md의 "Token / Cost Discipline" 조항이 다시 측정 가능한 정책이 된다.
- `workspace-audit` health 단계의 outlier 탐지·비용 추이 분석이 모든 태스크에 적용된다.
- 이후 도입되는 새 runner / extractor는 본 ADR의 규약을 따른다.

## 변경 이력

- 2026-05-13: ADR 초안 작성 (가설: ADR-007b 출력 포맷 폐기가 원인).
- 2026-05-13: 코드 실측 후 진단 정정. 진짜 원인은 자체 extractor가 usage 전파 규약 미구현이었음을 확인. ADR 전면 재작성. ADR-007b의 supersede 표기도 정정.
- (TBD): 적용 후 7일간 `token-usage.jsonl`로 회계 정상 동작 검증.
