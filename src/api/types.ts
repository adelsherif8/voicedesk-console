/** Shapes of the snapshot VoiceDesk publishes (evals/publish.py writes evals/results/published.json). */

export type ScenarioStatus = 'pass' | 'flaky' | 'fail';

export interface ScenarioSummary {
  runs: number;
  passes: number;
  contained: number;
  missed_handoffs: number;
  category: string | null;
  status: ScenarioStatus;
}

export interface AgentSummary {
  calls: number;
  containment_rate: number | null;
  transfer_rate: number | null;
  correct_transfers: number;
  unnecessary_transfers: number;
  missed_handoffs: number;
  missed_handoff_rate: number | null;
  task_success_rate: number | null;
  hallucination_rate: number | null;
  call_pass_rate: number | null;
  pass_k: number | null;
  flaky: string[];
  failing: string[];
  scenarios: Record<string, ScenarioSummary>;
  cost_usd: number;
}

/** One eval run without per-call results (what `history` holds). */
export interface RunSummary {
  id: string;
  /** Unix seconds. */
  created: number;
  git_sha: string;
  backend: string;
  agent_model: string;
  k: number;
  cost_usd: number;
  cost_by_role: Record<string, number>;
  aborted: string | null;
  planned_calls: number;
  patches: string[];
  summary: Record<string, AgentSummary>;
}

export type CheckKind = 'code' | 'judge' | 'classify';

export interface Check {
  id: string;
  kind: CheckKind;
  passed: boolean;
  advisory: boolean;
  detail: string;
  /** Index into the call's transcript array, or null when the check is about the whole call. */
  turn: number | null;
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface TranscriptTurn {
  turn: number;
  role: 'agent' | 'caller';
  text: string;
  tool_calls?: ToolCall[];
}

export interface CallResult {
  agent: string;
  scenario: string;
  title: string;
  category: string | null;
  attempt: number;
  handoff: string;
  handoff_expected: string | string[];
  end_reason: string;
  error: string | null;
  turns: number;
  checks: Check[];
  transcript: TranscriptTurn[];
  cost_usd: number;
  passed: boolean;
  contained: boolean;
  missed_handoff: boolean;
  hallucinated: boolean;
}

export interface Comparison {
  regressions: string[];
  warnings: string[];
  improvements: string[];
  broke: string[];
  containment: [number | null, number | null];
  shared: number;
  new: string[];
  baseline_run: string | null;
  baseline_k: number | null;
}

/** The latest full run per model: summaries plus every call with its transcript. */
export interface FullRun extends RunSummary {
  results: CallResult[];
  comparison?: Record<string, Comparison>;
}

export interface Snapshot {
  history: RunSummary[];
  latest: Record<string, FullRun>;
}
