---
name: study-pack-maintainer
description: "요청된 백엔드 학습 토픽이 기존 fos-study 파일을 갱신해야 하는지 새로 생성해야 하는지 판단하고, 기존 관련 문서를 바탕으로 최종 마크다운 본문을 Claude가 직접 생성한다. 스터디팩 작성 전 overlap 여부를 확인하고 싶을 때, 중복 파일을 피하고 싶을 때, update-vs-new 판단과 최종 콘텐츠 초안을 Claude가 담당하길 원할 때 사용."
---

# Study Pack Maintainer

중복 검사 + update-vs-new 판단 + 마크다운 생성을 Claude가 직접 수행하는 study-pack 유지보수 skill.

## 호출 방법

```bash
career-os/scripts/command-router/run_now.sh maintain-study-pack <topic>
```

일반 `study-pack`보다 overlap/update 전략이 중요할 때 사용한다.

실행 파일: `career-os/scripts/study-pack-maintainer/`(ADR-019).

## 입력

- `references/maintainer-prompt.md` — 공통 프롬프트 템플릿
- `config/topics.json` (study-pack-maintainer namespace) — 토픽 메타데이터
- 후보 기존 문서 (Claude가 overlap 검사) — `sources/fos-study/...`
- 요청된 토픽 설명 (자연어 또는 topic 키)

## 산출물

- `sources/fos-study/...` — `[초안]` 접두어로 게시 + git commit + push (단일 타깃)

Claude 결과에 포함: chosen action (`update-existing` / `create-new`), 출력 경로, 짧은 근거, 전체 마크다운 본문.

## fos-study 전체 점검 시

fos-study 저장소 전체 상태(broken link / orphan doc / cross-link 누락 등)를 미리 파악하고 싶다면 `docs-audit` skill을 먼저 실행한다. maintainer는 docs-audit 결과를 자동으로 호출하지 않으므로, 대규모 업데이트 전에 사용자가 수동으로 실행 권장.

docs-audit은 fos-study 측 진실 출처(`sources/fos-study/.claude/skills/docs-audit/SKILL.md`)의 심볼릭 링크다.

## 관련 ADR

ADR-005: 산출물 경로 컨벤션.
ADR-011: update-vs-new 정책.
ADR-019: scripts/<skill>/ 분리 컨벤션.
