#!/usr/bin/env bun
/**
 * _shared/lib/fos_study_git.ts
 * Git operations for sources/fos-study.
 * API: ensureRepo · commitFile · push
 * CLI: ensure-repo | commit-file | push
 *   commit-file exit codes: 0 = committed, 42 = skipped (no change), 1 = error
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const DEFAULT_REMOTE = "https://github.com/jon890/fos-study.git";

export interface EnsureRepoOptions {
  sourceDir: string;
  remoteUrl?: string;
}

export interface CommitFileOptions {
  sourceDir: string;
  relativePath: string;
  /** If provided, write to relativePath before committing. */
  contents?: string;
  /** Subject after "add|update ". Full msg: "{prefix} {action} {message}" */
  message: string;
  /** Prefix portion, e.g. "docs(backend):" */
  prefix: string;
}

export interface PushOptions {
  sourceDir: string;
  branch?: string;
}

export function ensureRepo({ sourceDir, remoteUrl = DEFAULT_REMOTE }: EnsureRepoOptions): void {
  if (!existsSync(join(sourceDir, ".git"))) {
    execSync(`git clone --depth=1 "${remoteUrl}" "${sourceDir}"`, { stdio: "inherit" });
  } else {
    execSync(`git -C "${sourceDir}" pull --ff-only`, { stdio: "inherit" });
  }
}

/** Write (if contents given) and commit. Returns the git action taken. */
export function commitFile({
  sourceDir,
  relativePath,
  contents,
  message,
  prefix,
}: CommitFileOptions): "add" | "update" | "skipped" {
  if (contents !== undefined) {
    const outputPath = join(sourceDir, relativePath);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, contents, "utf-8");
  }

  let isTracked = false;
  try {
    execSync(`git -C "${sourceDir}" ls-files --error-unmatch "${relativePath}"`, {
      stdio: "pipe",
    });
    isTracked = true;
  } catch {
    // untracked — new file
  }

  if (isTracked) {
    let hasChanges = false;
    try {
      execSync(`git -C "${sourceDir}" diff --quiet -- "${relativePath}"`, { stdio: "pipe" });
    } catch {
      hasChanges = true;
    }
    if (!hasChanges) {
      process.stdout.write(`No content change detected for ${relativePath}\n`);
      return "skipped";
    }
  }

  const action = isTracked ? "update" : "add";
  const commitMsg = `${prefix} ${action} ${message}`;
  execSync(`git -C "${sourceDir}" add "${relativePath}"`, { stdio: "inherit" });
  execSync(`git -C "${sourceDir}" commit -m "${commitMsg}"`, { stdio: "inherit" });
  return action;
}

/** Push to remote. Throws on failure (stderr printed via stdio:inherit). */
export function push({ sourceDir, branch = "HEAD" }: PushOptions): void {
  execSync(`git -C "${sourceDir}" push origin ${branch}`, { stdio: "inherit" });
}

if (import.meta.main) {
  const [cmd, ...rest] = process.argv.slice(2);
  const args: Record<string, string> = {};
  for (let i = 0; i < rest.length - 1; i++) {
    if (rest[i].startsWith("--")) {
      args[rest[i].slice(2)] = rest[i + 1];
      i++;
    }
  }

  switch (cmd) {
    case "ensure-repo":
      ensureRepo({ sourceDir: args["source-dir"], remoteUrl: args["remote-url"] });
      break;
    case "commit-file": {
      let contents: string | undefined;
      if (args["contents-from"]) {
        contents = readFileSync(args["contents-from"], "utf-8");
      }
      const result = commitFile({
        sourceDir: args["source-dir"],
        relativePath: args["rel-path"],
        contents,
        message: args["message"],
        prefix: args["prefix"],
      });
      if (result === "skipped") process.exit(42);
      break;
    }
    case "push":
      push({ sourceDir: args["source-dir"], branch: args["branch"] });
      break;
    default:
      process.stderr.write(`fos_study_git: unknown command "${cmd ?? "(none)"}"\n`);
      process.stderr.write(
        "Usage: fos_study_git.ts <ensure-repo|commit-file|push> [--opt val ...]\n",
      );
      process.exit(1);
  }
}
