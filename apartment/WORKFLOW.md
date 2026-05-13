# Apartment Workflow

## Goal

Produce a repeatable daily apartment market report for the target complex while keeping workflow logic durable in `~/ai-nodes/apartment`.

Current default target:
- 엘지원앙아파트 (LG원앙)
- 경기 구리시 수택동 854-2 / 체육관로 54
- focus unit: 59A / 전용 59㎡

## Source of truth

All business logic for the apartment workflow should live here:
- collectors
- normalizer
- Claude prompt
- task-specific config

OpenClaw workspace files should only provide thin delegation or scheduling glue.

## Current execution path

1. `skills/apartment-daily-report/scripts/run_report.sh`
2. self-wrap through `_shared/bin/track_task.sh`
3. collect source data from:
   - Naver Land (static collector)
   - optional Naver browser fallback
   - Hogangnono
   - KB Land
4. normalize into `summary.json`
5. synthesize `report.md` with Claude CLI JSON output
6. write artifacts under `data/YYYY-MM-DD/`
7. append run metadata under `logs/`

## Known behavior

- Naver Land API collection uses cookie/Bearer authentication and should paginate article lists until `isMoreData` is false (bounded by the collector's page cap), not just page 1.
- Hogangnono and KB Land are useful cross-check sources, especially for complex metadata and non-Naver listing context.
- Focus-unit matching is handled in the normalizer and should stay conservative.
- Whole-complex values must not be presented as focus-unit-confirmed unless exact match logic supports it.

## Guri buy-search preferences

Current buyer-priority scoring for the recurring Guri search:
- Put location/입지 first: daily infrastructure, transit/bus access, commercial/medical/school convenience, and easy walking routes should outweigh simple price sorting.
- Penalize steep hill / daily access friction. 수택주공 was visited and felt too uphill, so its price/area appeal should be discounted.
- Include good-location smaller units instead of filtering them out: keep LG원앙/엘지원앙 전용49/52 and 대림한숲 전용51 candidates visible when they fit the budget.
- Include 구리럭키 / 럭키아파트 (Naver complexNo `24858`) with direct Naver article links: `https://new.land.naver.com/complexes/24858?articleNo=<articleNo>`.
- Include 인창동 주공 by explicit Naver complex numbers instead of relying on Naver search endpoint discovery: 인창1단지주공 `1659`, 인창2단지주공 `1660`, 인창4단지주공 `1661`, 인창6단지주공 `1662`.
- Keep durable candidate complex metadata in `config/guri-buy-complexes.json`; use it as the source of truth for known complex numbers in broad Guri buy-search runs.
- From the 2026-05-08 run onward, skip 쌍용(440) / complexNo `1648` and 우림 / complexNo `1650` because the user decided not to consider them under the same <=500-household logic. The config now carries `selectionRules.minHouseholdsForRecommendation = 501`; do not recommend known sub-500-household complexes unless the user explicitly asks for comparison.
- Also skip 수택주공 / complexNo `8575` entirely because the user confirmed it is not flat enough for daily access. Treat non-flat / hill-access complexes as exclusion candidates, not just light score penalties, when the user has specifically rejected the terrain.
- For 구리럭키 and 인창동 주공, separate 실거주+주담대-friendly listings from 세안고/갭투 listings. 전세 끼고 매매 is difficult for the user, so treat 세안고, 전세안고, 전세승계, 월세승계, 갭투자, 임차인 거주, 갱신권, or late-2027/2028 occupancy as exclusion or severe de-prioritization unless explicitly requested for comparison.
- Prefer only 주인거주, 입주가능, 즉시입주, 공실 인도 가능, or near-term 입주협의 listings even if the sticker price is slightly higher. Naver detail API field `articlePrice.allWarrantPrice` corresponds to UI 기전세금; if it is greater than 0, filter the listing out as 전세 끼고 매매/tenant-deposit risk. If the collected listing data does not expose occupancy text, do not claim 입주가능; either exclude known tenant-occupied listings or label remaining candidates as 입주조건 전화 확인 대상 and make 세안고/기전세금 제외 여부 the first phone-screening question.
- Include estimated car commute time to NHN 판교 사옥 / NHN 플레이뮤지엄 (`경기 성남시 분당구 대왕판교로645번길 16`) as a ranking factor. Prefer live route/map data if available; otherwise use cautious estimates and label them as estimates, not verified live traffic. Penalize materially worse Pangyo car commute when other factors are similar.
- Morning Discord output should include about 30 listings directly in chat, sorted by recommendation priority, because this was the most actionable format for the user. Preferred grouping:
  - 1~10: 우선 전화해볼 후보
  - 11~20: 괜찮은 보조 후보
  - 21~30: 조건 맞으면 확인할 후보
- Each recommended listing line should be concise and include: 단지명, 가격, 전용면적/타입, 층+방향, direct Naver article link. Do not show raw Naver verification labels like OWNER/DOC/NDOC/NONE in user-facing output unless explicitly asked; use them only internally as weak confidence signals. Briefly state the ranking basis: 입지 우선 + 예산 6.5억 전후 + 층/방향 + 저층/언덕 감점.
- Do not include internal collection paths, raw report paths, or raw JSON paths in user-facing Discord/blog output unless explicitly requested.
- Notification policy for the recurring Guri buy-search: follow the career-os pattern where the task itself calls `skills/apartment-daily-report/scripts/notify_discord.sh` for start/completion/failure. Do not rely on a separate start-notice cron. Preferred flow: 시작 알림 → 종료/성공 알림(걸린시간 포함) or 실패 알림.

## Guardrails

- Prefer exact or clearly-labeled provisional matches.
- Do not invent prices, listing counts, or transaction evidence.
- If a source fails, preserve the failure in raw/summary outputs.
- Keep outputs reproducible and idempotent per report date when practical.

## Improvement priorities

1. Naver 수집은 ADR-001(쿠키+Bearer 기반 API 통합)로 정착했다. 후속: NID_SES 만료 감지/알림, JWT 자동 추출 PoC, 추가 교차검증 소스(국토부 실거래가 등) 검토.
2. Move target/source config from env defaults into explicit config files where useful.
3. Expand the smoke-test entrypoint into a routine health check for collector/normalizer changes.
4. Clarify notification policy vs pure batch mode.
5. Keep OpenClaw wrapper glue-only.

## Smoke test

Quick collector/normalizer health check:
- `skills/apartment-daily-report/scripts/run_smoke_test.sh`

Optional browser mode example:
- `NAVER_BROWSER_ENABLED=1 NAVER_BROWSER_CLAUDE_COMMAND='...' skills/apartment-daily-report/scripts/run_smoke_test.sh`

Current expectation:
- Naver collector should at least return a non-error status plus limited static signals.
- Hogangnono and KB Land should produce structured data.
- `summary.json` should be generated successfully.
