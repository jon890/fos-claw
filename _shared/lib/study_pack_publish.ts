#!/usr/bin/env bun
/**
 * _shared/lib/study_pack_publish.ts
 * Common fos-study publish pipeline: Claude call → validate → git commit/push → artifacts upsert.
 *
 * CLI env vars:
 *   TOPIC_KEY / STUDY_TOPIC      topic identifier
 *   OUTPUT_PATH / OUTPUT_REL_PATH  fos-study relative path
 *   COMMIT_DOMAIN / STUDY_DOMAIN   commit message domain
 *   COMMIT_TOPIC                   commit label (defaults to TOPIC_KEY)
 *   VALIDATOR_KIND                 study_pack | none  (default: study_pack)
 *   TASK_ROOT                      career-os root (default: ~/ai-nodes/career-os)
 *   OUTDIR                         local output dir (auto-computed if omitted)
 *   PROMPT_TEXT                    full prompt text (overrides PROMPT_FILE + auto-build)
 *   PROMPT_FILE                    path to prompt file (overrides auto-build)
 *   STUDY_TOPIC / STUDY_DOMAIN     used in auto-built prompt (study_pack kind)
 *   STUDY_APPEND_PROMPT            extra text appended during auto-build
 *   REPORT_DATE                    yyyy-mm-dd (defaults to today)
 */

import { execSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { persistUsage } from "./invoke_claude_skills.ts";
import { commitFile, ensureRepo, push } from "./fos_study_git.ts";

export interface StudyPackPublishOptions {
  topicKey: string;
  outputPath: string;
  commitDomain: string;
  promptText?: string;
  promptFile?: string;
  validatorKind?: "study_pack" | "none";
  commitTopic?: string;
  outdir?: string;
  taskRoot?: string;
  studyTopic?: string;
  studyDomain?: string;
  studyAppendPrompt?: string;
  reportDate?: string;
}

const OUTPUT_RULES = `
출력 규약 (엄수):
- 최종 마크다운 본문만 반환한다.
- 응답의 첫 글자는 반드시 '#' 이어야 한다.
- "파일을 생성했습니다" 같은 상태 메시지를 쓰지 않는다.
- 완료 노트, 요약, 리뷰 코멘트, 문서 개요 표를 포함하지 않는다.
- 응답 전체를 코드 펜스로 감싸지 않는다.
- 문서 내부의 모든 코드블록은 여는 fence에 언어를 명시한다. 예: \`\`\`java, \`\`\`bash, \`\`\`sql, \`\`\`yaml, \`\`\`json, \`\`\`text.
- bare triple backticks(\`\`\` 단독)로 코드블록을 열지 않는다.
- 작성한 내용을 설명하지 않는다. 실제 문서만 쓴다.`;

const RETRY_PROMPT = `
재시도 지시사항:
- 이전 응답이 검증을 통과하지 못했다.
- 최종 마크다운 본문만 출력한다.
- 응답의 첫 글자는 반드시 '#' 이어야 한다.
- 제목 앞에 서문·설명·상태 노트·요약 문장·섹션 표를 넣지 않는다.
- 응답을 비워 두지 않는다.
- 문서 내부 코드블록은 반드시 언어 태그가 있는 fence로 연다. bare \`\`\`는 검증 실패다.`;

function buildStudyPackPrompt(opts: StudyPackPublishOptions, taskRoot: string): string {
  const promptFilePath = join(
    taskRoot,
    "skills/study-pack-writer/references/study-pack-prompt.md",
  );
  const rulesFilePath = join(
    taskRoot,
    "skills/study-pack-writer/references/fos-study-writing-rules.md",
  );
  const profileFilePath = join(taskRoot, "config/candidate-profile.md");
  const topic = opts.studyTopic ?? opts.topicKey;
  const domain = opts.studyDomain ?? opts.commitDomain;

  let text = readFileSync(promptFilePath, "utf-8");
  text += "\n\n다음 fos-study 작성 규칙을 함께 따른다:\n";
  text += readFileSync(rulesFilePath, "utf-8");
  text += `\n\n토픽: ${topic}\n도메인: ${domain}\n`;
  text += `지원자 프로필: ${profileFilePath}\n`;
  text += `fos-study 내부 출력 경로: ${opts.outputPath}\n`;
  text +=
    "\n호출부에서 넘긴 추가 요구사항은 토픽 범위를 좁히고 참조를 정의하는 데 사용한다.\n";
  text += "DB 관련 토픽이면 MySQL 8에서 실행 가능한 예제를 유지한다.\n";
  text += "면접 중심 토픽이면 시니어 백엔드 관점으로 작성한다.\n";
  if (opts.studyAppendPrompt) text += "\n" + opts.studyAppendPrompt + "\n";
  text += OUTPUT_RULES;
  return text;
}

export function studyPackPublish(opts: StudyPackPublishOptions): void {
  const HOME = process.env.HOME!;
  const taskRoot = opts.taskRoot ?? join(HOME, "ai-nodes/career-os");
  const reportDate = opts.reportDate ?? new Date().toISOString().slice(0, 10);
  const validatorKind = opts.validatorKind ?? "study_pack";
  const commitTopic = opts.commitTopic ?? opts.topicKey;

  const OUTDIR =
    opts.outdir ??
    join(taskRoot, "data/reports/daily", reportDate, `study-pack-${opts.topicKey}`);
  const SOURCE_DIR = join(taskRoot, "sources/fos-study");
  const RAW_JSON = join(OUTDIR, "claude.result.json");
  const GENERATED_MD = join(OUTDIR, "generated.md");
  const INPUT_NOTE = join(OUTDIR, "analysis-input.md");
  const ARTIFACTS_JSON = join(taskRoot, "data/generated-artifacts.json");
  const UPDATE_ARTIFACTS_PY = join(HOME, "ai-nodes/_shared/bin/update_artifacts.py");

  mkdirSync(OUTDIR, { recursive: true });

  // Build and write prompt (always overwrite to pick up config changes)
  const promptText =
    opts.promptText ??
    (opts.promptFile ? readFileSync(opts.promptFile, "utf-8") : buildStudyPackPrompt(opts, taskRoot));
  writeFileSync(INPUT_NOTE, promptText, "utf-8");

  function runClaude(appendText?: string): boolean {
    if (appendText) {
      writeFileSync(INPUT_NOTE, readFileSync(INPUT_NOTE, "utf-8") + appendText, "utf-8");
    }
    rmSync(RAW_JSON, { force: true });
    try {
      execSync(
        `timeout 900s claude --permission-mode bypassPermissions --print --output-format json --no-session-persistence "$(cat '${INPUT_NOTE}')" > '${RAW_JSON}'`,
        { shell: "/bin/bash", stdio: ["inherit", "inherit", "inherit"], timeout: 960_000 },
      );
    } catch {
      process.stderr.write(`claude CLI failed for study-pack ${opts.topicKey}\n`);
      return false;
    }
    if (!existsSync(RAW_JSON) || statSync(RAW_JSON).size === 0) {
      process.stderr.write(`claude CLI produced empty output for ${opts.topicKey}\n`);
      return false;
    }
    persistUsage(RAW_JSON);
    return true;
  }

  function extractAndValidate(): boolean {
    rmSync(GENERATED_MD, { force: true });
    if (validatorKind === "none") {
      try {
        const payload = JSON.parse(readFileSync(RAW_JSON, "utf-8")) as { result?: string };
        const content = (payload.result ?? "").trim();
        if (!content) {
          process.stderr.write("envelope.result is empty\n");
          return false;
        }
        writeFileSync(GENERATED_MD, content + "\n", "utf-8");
        return true;
      } catch (err) {
        process.stderr.write(`extraction failed: ${err}\n`);
        return false;
      }
    }
    // study_pack: delegate to extract_and_validate_study_pack.ts
    const extractor = join(
      taskRoot,
      "scripts/study-pack-writer/extract_and_validate_study_pack.ts",
    );
    const result = spawnSync("bun", ["run", extractor, RAW_JSON, GENERATED_MD], {
      stdio: "inherit",
      timeout: 120_000,
    });
    return result.status === 0;
  }

  function attempt(appendText?: string): boolean {
    if (!runClaude(appendText)) return false;
    return extractAndValidate();
  }

  if (!attempt()) {
    process.stderr.write(
      `First generation failed for ${opts.topicKey}, retrying once with stricter prompt...\n`,
    );
    if (!attempt(RETRY_PROMPT)) {
      process.stderr.write(
        `Study-pack generation failed after retry for ${opts.topicKey}\n`,
      );
      process.exit(1);
    }
  }

  // Git publish
  ensureRepo({ sourceDir: SOURCE_DIR });
  const generatedContent = readFileSync(GENERATED_MD, "utf-8");
  const gitAction = commitFile({
    sourceDir: SOURCE_DIR,
    relativePath: opts.outputPath,
    contents: generatedContent,
    message: `draft ${commitTopic} study pack`,
    prefix: `docs(${opts.commitDomain}):`,
  });
  if (gitAction === "skipped") {
    process.stdout.write(`No content change for ${opts.outputPath}\n`);
    return;
  }
  push({ sourceDir: SOURCE_DIR });
  const commitHash = execSync(`git -C "${SOURCE_DIR}" rev-parse HEAD`, {
    encoding: "utf-8",
  }).trim();
  execSync(
    `python3 "${UPDATE_ARTIFACTS_PY}" "${ARTIFACTS_JSON}" "${opts.topicKey}" "${opts.outputPath}" "${commitHash}"`,
    { shell: "/bin/bash", stdio: "inherit" },
  );
  process.stdout.write(
    `Committed and pushed: docs(${opts.commitDomain}): ${gitAction} draft ${commitTopic} study pack (${commitHash})\n`,
  );
}

// CLI entry point
if (import.meta.main) {
  const env = process.env;
  const topicKey = env.TOPIC_KEY ?? env.STUDY_TOPIC ?? "";
  const outputPath = env.OUTPUT_PATH ?? env.OUTPUT_REL_PATH ?? "";
  const commitDomain = env.COMMIT_DOMAIN ?? env.STUDY_DOMAIN ?? "";

  if (!topicKey) {
    process.stderr.write("TOPIC_KEY or STUDY_TOPIC is required\n");
    process.exit(1);
  }
  if (!outputPath) {
    process.stderr.write("OUTPUT_PATH or OUTPUT_REL_PATH is required\n");
    process.exit(1);
  }
  if (!commitDomain) {
    process.stderr.write("COMMIT_DOMAIN or STUDY_DOMAIN is required\n");
    process.exit(1);
  }

  studyPackPublish({
    topicKey,
    outputPath,
    commitDomain,
    promptText: env.PROMPT_TEXT,
    promptFile: env.PROMPT_FILE,
    validatorKind: (env.VALIDATOR_KIND as "study_pack" | "none" | undefined) ?? "study_pack",
    commitTopic: env.COMMIT_TOPIC ?? env.STUDY_TOPIC,
    outdir: env.OUTDIR,
    taskRoot: env.TASK_ROOT,
    studyTopic: env.STUDY_TOPIC,
    studyDomain: env.STUDY_DOMAIN,
    studyAppendPrompt: env.STUDY_APPEND_PROMPT,
    reportDate: env.REPORT_DATE,
  });
}
