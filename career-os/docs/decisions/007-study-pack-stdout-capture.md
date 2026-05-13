# ADR-007: study-pack 생성 방식 — 파일 쓰기 → stdout 캡처로 전환

## 상태

채택됨 (2026-04-14). 이후 study-pack runner는 `--output-format json`을 다시 채택했으므로(현 `run_study_pack.sh` 참조), 본 ADR의 *출력 포맷 폐기* 결정 부분은 사실상 무효화되었다. 핵심 결정(Claude에게 Write 도구로 파일 쓰기를 시키지 않는다)은 유지된다. 토큰 회계 누락의 진짜 원인 및 처방은 [ADR-014](014-restore-claude-usage-with-stdout-capture.md) 참조.

## 맥락

`run_study_pack.sh`는 Claude CLI를 호출해 study-pack 마크다운 문서를 생성한다.
기존 방식은 Claude에게 두 가지 작업을 동시에 시켰다.

1. `$TMP_DRAFT` 파일에 문서를 직접 쓴다 (Write 도구 사용)
2. 완료 후 "한 줄 완료 메시지"만 텍스트로 응답한다

이 두 지시가 `study-pack-prompt.md`의 "Output only the final markdown document body" 지시와
**충돌**하고 있었다. Claude 입장에서:

- prompt.md → "stdout에 문서를 출력해라"
- CLI 프롬프트 → "파일에 쓰고, 응답은 한 줄만 해라"

실제로는 Claude가 파일 쓰기를 올바르게 수행하고 있었지만, "한 줄 완료 메시지" 지시는
무시되고 상세한 변경 로그가 응답으로 생성됐다. 이로 인해:

- 사용자가 터미널/UI에서 본 Claude 응답("파일이 생성됐다 / 문서 구성: ..." 형태)을
  문서 파일에 저장된 내용으로 오해하는 혼란이 발생했다.
- 특정 실행에서 Claude가 prompt.md 지시를 우선하면 파일을 쓰지 않고 stdout으로
  문서를 출력할 위험이 있었다. 그 경우 `$TMP_DRAFT`는 placeholder로 남고
  validation이 실패하거나, 잘못된 내용이 저장될 수 있었다.

## 결정

Claude에게 파일 쓰기를 시키지 않고, **stdout 출력을 직접 `$TMP_DRAFT`로 캡처**한다.

```bash
# 변경 전
timeout 900s claude --permission-mode bypassPermissions --print --output-format json \
  "Read the instruction file at $INPUT_NOTE. Then directly overwrite the file $TMP_DRAFT ..." \
  > "$CLAUDE_JSON"

# 변경 후
timeout 900s claude --permission-mode bypassPermissions --print \
  "$(cat "$INPUT_NOTE")" \
  > "$TMP_DRAFT"
```

`study-pack-prompt.md`의 기존 "Output only the final markdown document body" 지시가
이 방식에 정확히 부합하므로 prompt.md는 수정하지 않는다.

## 결과

- 프롬프트 충돌 제거: Claude는 하나의 명확한 지시("마크다운을 stdout으로 출력")만 받는다.
- 파일 쓰기 도구 의존 제거: Write 도구를 호출하지 않으므로 Claude의 도구 선택에 의존하지 않는다.
- 응답 텍스트가 문서로 혼입될 가능성 차단: stdout이 곧 문서이므로 Claude의 "설명 텍스트"가
  파일에 섞일 경로 자체가 없다.
- `CLAUDE_JSON` 제거: JSON 출력 형식을 사용하지 않으므로 불필요한 변수를 정리했다.
  비용 정보는 claude.ai 대시보드에서 확인한다.
- 기존 validation (startswith('#'), bad_prefixes, 80줄 이상) 은 그대로 유지된다.
