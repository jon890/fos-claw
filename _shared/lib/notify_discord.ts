#!/usr/bin/env bun
// _shared/lib/notify_discord.ts
// Discord 알림 — Discord REST 우선, media는 openclaw CLI fallback. ADR-021.
//
// Usage:
//   bun --env-file=<ws>/.env _shared/lib/notify_discord.ts [--media <path>] "<message>"
//   또는 import { notifyDiscord } from "@shared/lib/notify_discord.ts"
//
// 환경 변수:
//   DISCORD_CHANNEL_ID (필수) — 누락 시 exit 1.
//   DISCORD_BOT_TOKEN (선택) — 없으면 ~/.openclaw/openclaw.json channels.discord.token 사용.

const OPENCLAW_TIMEOUT_MS = 10_000;
const DISCORD_API_BASE = "https://discord.com/api/v10";

export interface NotifyOptions {
  media?: string;
}

async function readDiscordToken(): Promise<string | undefined> {
  const envToken = process.env.DISCORD_BOT_TOKEN?.trim();
  if (envToken) return envToken;

  const home = process.env.HOME;
  if (!home) return undefined;

  try {
    const configPath = `${home}/.openclaw/openclaw.json`;
    const raw = await Bun.file(configPath).text();
    const config = JSON.parse(raw);
    const token = config?.channels?.discord?.token;
    return typeof token === "string" && token.trim() ? token.trim() : undefined;
  } catch {
    return undefined;
  }
}

async function notifyDiscordRest(message: string, channelId: string): Promise<boolean> {
  const token = await readDiscordToken();
  if (!token) return false;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENCLAW_TIMEOUT_MS);
  try {
    const res = await fetch(`${DISCORD_API_BASE}/channels/${encodeURIComponent(channelId)}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: message }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[notify_discord] Discord REST ${res.status}: ${body.slice(0, 500)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[notify_discord] Discord REST failed: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function notifyDiscord(message: string, opts?: NotifyOptions): Promise<void> {
  const channelId = process.env.DISCORD_CHANNEL_ID;
  if (!channelId) {
    console.error("[notify_discord] DISCORD_CHANNEL_ID env 누락 — 알림 발송 불가 (ADR-021)");
    process.exit(1);
  }

  // Text-only notifications use Discord REST directly. This avoids the
  // `openclaw message send` CLI path occasionally waiting on a fresh Discord
  // provider session while the already-running Gateway can send normally.
  if (!opts?.media && await notifyDiscordRest(message, channelId)) {
    return;
  }

  const args = [
    "message", "send",
    "--channel", "discord",
    "--target", `channel:${channelId}`,
    "--message", message,
    "--json",
  ];
  if (opts?.media) {
    args.splice(args.indexOf("--message"), 0, "--media", opts.media);
  }

  const proc = Bun.spawn(["openclaw", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const timeoutId = setTimeout(() => {
    proc.kill();
    console.error(`[notify_discord] openclaw timeout after ${OPENCLAW_TIMEOUT_MS}ms`);
  }, OPENCLAW_TIMEOUT_MS);

  const exitCode = await proc.exited;
  clearTimeout(timeoutId);

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    console.error(`[notify_discord] openclaw exit ${exitCode}: ${stderr.trim()}`);
    process.exit(1);
  }
}

// CLI 진입점
if (import.meta.main) {
  const argv = process.argv.slice(2);
  let media: string | undefined;
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--media") {
      media = argv[++i];
    } else {
      positional.push(argv[i]);
    }
  }

  const message = positional[0];
  if (!message) {
    console.error("usage: notify_discord.ts [--media <path>] <message>");
    process.exit(1);
  }

  await notifyDiscord(message, media ? { media } : undefined);
}
