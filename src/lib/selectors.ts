import type { AgentSummary, RunSummary, Snapshot } from '../api/types';

export interface RunRow {
  id: string;
  created: number;
  model: string;
  calls: number;
  /** Share of calls that passed every blocking check, weighted across agents by call count. */
  passRate: number | null;
  containment: number | null;
  /** Missed handoffs: the scenario required a transfer and none happened. */
  critical: number;
  /** True when the snapshot holds this run's transcripts (the latest run per model). */
  hasResults: boolean;
}

const ratio = (num: number, den: number): number | null => (den === 0 ? null : num / den);

function agentsOf(run: RunSummary, agent?: string): AgentSummary[] {
  const entries = Object.entries(run.summary);
  return entries.filter(([id]) => agent === undefined || id === agent).map(([, s]) => s);
}

export function runRow(run: RunSummary, agent: string | undefined, hasResults: boolean): RunRow {
  const agents = agentsOf(run, agent);
  const calls = agents.reduce((n, a) => n + a.calls, 0);
  const passed = agents.reduce((n, a) => n + (a.call_pass_rate ?? 0) * a.calls, 0);
  const contained = agents.reduce((n, a) => n + (a.containment_rate ?? 0) * a.calls, 0);
  return {
    id: run.id,
    created: run.created,
    model: run.agent_model,
    calls,
    passRate: ratio(passed, calls),
    containment: ratio(contained, calls),
    critical: agents.reduce((n, a) => n + a.missed_handoffs, 0),
    hasResults,
  };
}

/** Every run in the snapshot, newest first. `agent` restricts the metrics to that agent's calls. */
export function runRows(snapshot: Snapshot, agent?: string): RunRow[] {
  const withResults = new Set(Object.values(snapshot.latest).map((r) => r.id));
  return [...snapshot.history]
    .sort((a, b) => b.created - a.created)
    .map((run) => runRow(run, agent, withResults.has(run.id)));
}
