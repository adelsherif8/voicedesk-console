import type {
  AgentSummary,
  CallResult,
  Check,
  FullRun,
  RunSummary,
  ScenarioStatus,
  Snapshot,
} from '../api/types';

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

export const AGENTS = ['dental', 'receptionist', 'recovery'] as const;
export type AgentId = (typeof AGENTS)[number];

export const STATUSES = ['passed', 'failed', 'critical'] as const;
export type StatusFilter = (typeof STATUSES)[number];

export interface Filters {
  agent?: AgentId;
  status?: StatusFilter;
}

const isAgent = (x: string): x is AgentId => (AGENTS as readonly string[]).includes(x);
const isStatus = (x: string): x is StatusFilter => (STATUSES as readonly string[]).includes(x);

/** Filters from the query string. Anything unknown is dropped so a stale link still loads. */
export function parseFilters(params: URLSearchParams): Filters {
  const agent = params.get('agent') ?? '';
  const status = params.get('status') ?? '';
  return { ...(isAgent(agent) ? { agent } : {}), ...(isStatus(status) ? { status } : {}) };
}

export interface ScenarioRow {
  agent: string;
  id: string;
  title: string;
  category: string;
  status: ScenarioStatus;
  passes: number;
  runs: number;
  missed: number;
}

const STATUS_ORDER: Record<ScenarioStatus, number> = { fail: 0, flaky: 1, pass: 2 };

function matchesStatus(row: ScenarioRow, status: StatusFilter | undefined): boolean {
  switch (status) {
    case 'passed':
      return row.status === 'pass';
    case 'failed':
      return row.status !== 'pass';
    case 'critical':
      return row.missed > 0;
    case undefined:
      return true;
  }
}

/**
 * The run's scenarios as table rows: failures first, then flaky, then passes; within a status the
 * ones with missed handoffs first. Titles come from the transcripts when the run has them.
 */
export function scenarioRows(run: RunSummary | FullRun, filters: Filters): ScenarioRow[] {
  const titles = new Map<string, string>();
  for (const r of 'results' in run ? run.results : []) titles.set(`${r.agent}/${r.scenario}`, r.title);
  const rows: ScenarioRow[] = [];
  for (const [agent, summary] of Object.entries(run.summary)) {
    if (filters.agent !== undefined && agent !== filters.agent) continue;
    for (const [id, s] of Object.entries(summary.scenarios)) {
      rows.push({
        agent,
        id,
        title: titles.get(`${agent}/${id}`) ?? id,
        category: (s.category ?? '').replace(/_/g, ' '),
        status: s.status,
        passes: s.passes,
        runs: s.runs,
        missed: s.missed_handoffs,
      });
    }
  }
  return rows
    .filter((r) => matchesStatus(r, filters.status))
    .sort(
      (a, b) =>
        a.agent.localeCompare(b.agent) ||
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        b.missed - a.missed ||
        a.id.localeCompare(b.id),
    );
}

/** The run with that id, with transcripts when the snapshot has them (latest run per model). */
export function findRun(snapshot: Snapshot, runId: string): RunSummary | FullRun | undefined {
  return (
    Object.values(snapshot.latest).find((r) => r.id === runId) ?? snapshot.history.find((r) => r.id === runId)
  );
}

/** The k attempts of one scenario, in attempt order. Empty when the run has no transcripts. */
export function attemptsOf(run: RunSummary | FullRun, agent: string, scenarioId: string): CallResult[] {
  if (!('results' in run)) return [];
  return run.results
    .filter((r) => r.agent === agent && r.scenario === scenarioId)
    .sort((a, b) => a.attempt - b.attempt);
}

/**
 * The check a reader should look at first (mirrors voicedesk's _first_failure): a missed or wrong
 * handoff, then any other blocking failure, code checks before judge checks. Advisory and
 * classify checks never count.
 */
export function firstFailure(checks: Check[]): Check | null {
  const blocking = checks.filter((c) => !c.passed && !c.advisory && c.kind !== 'classify');
  blocking.sort(
    (a, b) =>
      Number(a.id !== 'handoff') - Number(b.id !== 'handoff') ||
      Number(a.kind !== 'code') - Number(b.kind !== 'code'),
  );
  return blocking[0] ?? null;
}

/** Transcript index to highlight: the first failure's turn, or the first blocking failure that has one. */
export function failingTurn(result: CallResult): number | null {
  const first = firstFailure(result.checks);
  if (first === null) return null;
  if (first.turn !== null) return first.turn;
  const located = result.checks.find(
    (c) => !c.passed && !c.advisory && c.kind !== 'classify' && c.turn !== null,
  );
  return located?.turn ?? null;
}
