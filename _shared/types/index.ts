// _shared/types/index.ts
// ai-nodes 워크스페이스 공용 TS 타입 (ADR-019)

/**
 * `claude --print --output-format json` 의 envelope.
 * `invoke_claude_skills.ts` 가 이 형태로 결과 반환.
 */
export interface ClaudeUsage {
  result?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
    service_tier?: string;
  };
  modelUsage?: Record<string, unknown>;
  total_cost_usd?: number;
  session_id?: string;
  uuid?: string;
  // claude CLI 가 추가하는 필드는 unknown 으로 흘려보냄
  [key: string]: unknown;
}

/**
 * `logs/task-runs.jsonl` 한 줄 entry.
 * `format_cost_summary.ts` 가 이 형태로 latest 한 줄 파싱.
 * `track_task.sh` 가 채우는 필드 기준.
 */
export interface TaskRunEntry {
  run_id: string;
  task_name: string;
  start_time: string;
  end_time: string;
  duration_sec: number;
  status: "success" | "failed";
  exit_code: number;
  command: string;
  model: string | null;
  tokens_in_delta: number | null;
  tokens_out_delta: number | null;
  cached_tokens_delta: number | null;
  cache_read_input_tokens: number | null;
  cost_usd: number | null;
  service_tier: string | null;
  // 그 외 track_task.sh 필드는 unknown 으로 흘려보냄
  [key: string]: unknown;
}

/**
 * study-pack-topics.json / question-bank-topics.json 의 단일 토픽 entry (ADR-027 분리 후).
 * namespace 별로 같은 형태.
 */
export interface TopicEntry {
  domain?: string;
  outputPath?: string;
  title?: string;
  promptAppend?: string;
  inputFiles?: string[];
  // 미래 확장 필드는 unknown
  [key: string]: unknown;
}
