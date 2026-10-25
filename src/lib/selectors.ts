import type {
  AgentSummary,
  CallResult,
  Check,
  Comparison,
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
  /** Critical failures: missed handoffs plus security criticals (prompt leak, PII leak, unauthorized tool call). */
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
    critical: agents.reduce((n, a) => n + a.missed_handoffs + (a.criticals ?? 0), 0),
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

export const TRACKS = ['security'] as const;
export type Track = (typeof TRACKS)[number];

export interface Filters {
  agent?: AgentId;
  status?: StatusFilter;
  /** 'security' keeps only the security-track scenarios. */
  track?: Track;
}

const isAgent = (x: string): x is AgentId => (AGENTS as readonly string[]).includes(x);
const isStatus = (x: string): x is StatusFilter => (STATUSES as readonly string[]).includes(x);
const isTrack = (x: string): x is Track => (TRACKS as readonly string[]).includes(x);

/** Filters from the query string. Anything unknown is dropped so a stale link still loads. */
export function parseFilters(params: URLSearchParams): Filters {
  const agent = params.get('agent') ?? '';
  const status = params.get('status') ?? '';
  const track = params.get('track') ?? '';
  return {
    ...(isAgent(agent) ? { agent } : {}),
    ...(isStatus(status) ? { status } : {}),
    ...(isTrack(track) ? { track } : {}),
  };
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
  /** Calls with a security critical. */
  criticals: number;
}

const STATUS_ORDER: Record<ScenarioStatus, number> = { fail: 0, flaky: 1, pass: 2 };

function matchesStatus(row: ScenarioRow, status: StatusFilter | undefined): boolean {
  switch (status) {
    case 'passed':
      return row.status === 'pass';
    case 'failed':
      return row.status !== 'pass';
    case 'critical':
      return row.missed > 0 || row.criticals > 0;
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
        criticals: s.criticals ?? 0,
      });
    }
  }
  return rows
    .filter((r) => matchesStatus(r, filters.status))
    .filter((r) => filters.track === undefined || r.category === filters.track)
    .sort(
      (a, b) =>
        a.agent.localeCompare(b.agent) ||
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        b.criticals - a.criticals ||
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

/** Checks whose failure is a security critical (voicedesk's CRITICAL_CHECKS). */
export const CRITICAL_CHECKS: ReadonlySet<string> = new Set([
  'canary_leak',
  'prompt_leak',
  'pii_leak',
  'tool_guard',
]);

/**
 * The check a reader should look at first (mirrors voicedesk's _first_failure): a security
 * critical, then a missed or wrong handoff, then any other blocking failure, code checks before
 * judge checks. Advisory and classify checks never count.
 */
export function firstFailure(checks: Check[]): Check | null {
  const blocking = checks.filter((c) => !c.passed && !c.advisory && c.kind !== 'classify');
  blocking.sort(
    (a, b) =>
      Number(!CRITICAL_CHECKS.has(a.id)) - Number(!CRITICAL_CHECKS.has(b.id)) ||
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

export type ChangeKind = 'regression' | 'warning' | 'improvement' | 'new';

export interface ChangeRow {
  kind: ChangeKind;
  scenario: string;
  detail: string;
  /** A missed handoff that the baseline did not have. */
  critical: boolean;
}

const CRITICAL_TAG = ' [critical]';

function changeRow(kind: ChangeKind, line: string): ChangeRow {
  const critical = line.endsWith(CRITICAL_TAG);
  const text = critical ? line.slice(0, -CRITICAL_TAG.length) : line;
  const colon = text.indexOf(': ');
  return {
    kind,
    scenario: colon === -1 ? text : text.slice(0, colon),
    detail: colon === -1 ? '' : text.slice(colon + 2),
    critical,
  };
}

/**
 * voicedesk's comparison as rows in the order a reader needs them: regressions (what now fails or
 * misses a handoff), warnings (pass -> flaky), improvements, then scenarios new since the baseline.
 * Lines arrive as "<scenario>: <detail>", with " [critical]" appended to missed-handoff regressions.
 */
export function comparisonRows(cmp: Comparison): ChangeRow[] {
  return [
    ...cmp.regressions.map((l) => changeRow('regression', l)),
    ...cmp.warnings.map((l) => changeRow('warning', l)),
    ...cmp.improvements.map((l) => changeRow('improvement', l)),
    ...cmp.new.map((id) => ({
      kind: 'new' as const,
      scenario: id,
      detail: 'not in the baseline',
      critical: false,
    })),
  ];
}

export type VerdictKind = 'critical' | 'gave-way' | 'held' | 'none' | 'unavailable';

export interface SecurityRow {
  agent: string;
  calls: number;
  resistance: number | null;
  promptLeaks: number;
  piiLeaks: number;
  unauthorized: number;
  criticals: number;
  verdict: { kind: VerdictKind; label: string };
}

function verdictOf(s: AgentSummary): SecurityRow['verdict'] {
  if (s.security_calls === undefined) return { kind: 'unavailable', label: 'predates the security track' };
  const resistance = s.injection_resistance_rate ?? null;
  if ((s.criticals ?? 0) > 0) return { kind: 'critical', label: `${s.criticals ?? 0} critical` };
  if (resistance !== null && resistance < 1) {
    return { kind: 'gave-way', label: `no leak, ${Math.round((1 - resistance) * 100)}% gave way` };
  }
  if (s.security_calls > 0) return { kind: 'held', label: 'held' };
  return { kind: 'none', label: 'no security scenarios in this run' };
}

/** One row per agent for the Security table, with the same verdict rules as voicedesk's /evals page. */
export function securityRows(run: RunSummary): SecurityRow[] {
  return Object.entries(run.summary)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([agent, s]) => ({
      agent,
      calls: s.security_calls ?? 0,
      resistance: s.injection_resistance_rate ?? null,
      promptLeaks: s.prompt_leaks ?? 0,
      piiLeaks: s.pii_leaks ?? 0,
      unauthorized: s.unauthorized_tool_calls ?? 0,
      criticals: s.criticals ?? 0,
      verdict: verdictOf(s),
    }));
}

/** True when no agent in the run carries security-track fields. */
export const predatesSecurity = (run: RunSummary): boolean =>
  Object.values(run.summary).every((s) => s.security_calls === undefined);

/** The OWASP LLM ids each scenario covers, read from the scenario definitions in the results. */
export function owaspByScenario(run: RunSummary | FullRun): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const r of 'results' in run ? run.results : []) {
    const ids = r.scenario_def?.owasp ?? [];
    if (ids.length > 0) out.set(`${r.agent}/${r.scenario}`, ids);
  }
  return out;
}

export interface SecurityScenarioRow extends ScenarioRow {
  owasp: string[];
}

/** The run's security scenarios with their OWASP ids, criticals first within each agent. */
export function securityScenarios(run: RunSummary | FullRun): SecurityScenarioRow[] {
  const owasp = owaspByScenario(run);
  return scenarioRows(run, {})
    .filter((r) => r.category === 'security')
    .map((r) => ({ ...r, owasp: owasp.get(`${r.agent}/${r.id}`) ?? [] }));
}
