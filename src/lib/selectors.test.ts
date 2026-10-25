import {
  attemptsOf,
  comparisonRows,
  failingTurn,
  firstFailure,
  parseFilters,
  runRows,
  scenarioRows,
} from './selectors';
import {
  bookingAttempt1,
  dentalSummary,
  emergencyAttempt1,
  latestRun,
  olderRun,
  snapshot,
} from '../test/fixtures';
import { piiLeakCall, securityRun, securitySnapshot } from '../test/securityFixtures';

describe('runRows', () => {
  it('lists every run newest first with metrics aggregated across agents, weighted by calls', () => {
    const rows = runRows(snapshot);
    expect(rows.map((r) => r.id)).toEqual(['20261022-110136-bbbb', '20261020-090000-aaaa']);
    const latest = rows[0]!;
    expect(latest.model).toBe('gpt-4o-mini');
    expect(latest.created).toBe(1792656096);
    expect(latest.calls).toBe(9);
    // dental 3/6 passed + receptionist 3/3 passed = 6/9
    expect(latest.passRate).toBeCloseTo(6 / 9);
    expect(latest.containment).toBeCloseTo(6 / 9);
    expect(latest.critical).toBe(1);
    expect(latest.hasResults).toBe(true);
    expect(rows[1]!.hasResults).toBe(false);
  });

  it('restricts the metrics to one agent when asked', () => {
    const [latest, older] = runRows(snapshot, 'dental');
    expect(latest!.passRate).toBeCloseTo(0.5);
    expect(latest!.calls).toBe(6);
    expect(latest!.critical).toBe(1);
    expect(older!.passRate).toBe(1);
  });

  it('reports null rates for a run without calls instead of dividing by zero', () => {
    const [row] = runRows(snapshot, 'recovery');
    expect(row!.calls).toBe(0);
    expect(row!.passRate).toBeNull();
    expect(row!.containment).toBeNull();
  });
});

describe('scenarioRows', () => {
  it('lists every scenario of every agent in the run, failures first', () => {
    const rows = scenarioRows(latestRun, {});
    expect(rows.map((r) => `${r.agent}/${r.id}`)).toEqual([
      'dental/emergency-swelling',
      'dental/new-patient-booking',
      'receptionist/gate-code-lookup',
    ]);
    expect(rows[0]).toMatchObject({
      status: 'fail',
      passes: 0,
      runs: 3,
      missed: 1,
      title: 'Facial swelling after extraction',
    });
  });

  it('filters by agent', () => {
    expect(scenarioRows(latestRun, { agent: 'receptionist' }).map((r) => r.id)).toEqual(['gate-code-lookup']);
  });

  it('filters by status: passed, failed (fail or flaky) and critical (missed handoff)', () => {
    expect(scenarioRows(latestRun, { status: 'passed' }).map((r) => r.id)).toEqual([
      'new-patient-booking',
      'gate-code-lookup',
    ]);
    expect(scenarioRows(latestRun, { status: 'failed' }).map((r) => r.id)).toEqual(['emergency-swelling']);
    expect(scenarioRows(latestRun, { status: 'critical' }).map((r) => r.id)).toEqual(['emergency-swelling']);
    expect(scenarioRows(latestRun, { agent: 'receptionist', status: 'critical' })).toEqual([]);
  });

  it('falls back to the scenario id when the run has no transcripts to take a title from', () => {
    const summaryOnly = { ...olderRun, summary: { dental: dentalSummary } };
    const rows = scenarioRows(summaryOnly, {});
    expect(rows.map((r) => r.title)).toEqual(['emergency-swelling', 'new-patient-booking']);
  });
});

describe('parseFilters', () => {
  it('reads agent and status from the query string and ignores unknown values', () => {
    expect(parseFilters(new URLSearchParams('agent=dental&status=critical'))).toEqual({
      agent: 'dental',
      status: 'critical',
    });
    expect(parseFilters(new URLSearchParams('agent=&status=bogus'))).toEqual({});
  });
});

describe('attemptsOf and firstFailure', () => {
  it('returns the k attempts of one scenario in attempt order', () => {
    const attempts = attemptsOf(latestRun, 'dental', 'emergency-swelling');
    expect(attempts.map((a) => a.attempt)).toEqual([1, 2, 3]);
    expect(attemptsOf(latestRun, 'dental', 'nope')).toEqual([]);
  });

  it('points at the missed handoff before any other blocking failure, and never at an advisory one', () => {
    const first = firstFailure(emergencyAttempt1.checks);
    expect(first?.id).toBe('handoff');
    const withoutHandoff = emergencyAttempt1.checks.filter((c) => c.id !== 'handoff');
    expect(firstFailure(withoutHandoff)?.id).toBe('grounded');
    expect(firstFailure(bookingAttempt1.checks)).toBeNull();
  });

  it('highlights the transcript entry the first failure points at, falling back to the first flagged turn', () => {
    expect(failingTurn(emergencyAttempt1)).toBe(2); // handoff check has no turn; grounded is at turn 2
    expect(failingTurn(bookingAttempt1)).toBeNull();
  });
});

describe('comparisonRows', () => {
  it('flattens the comparison into rows with regressions first, then warnings, improvements and new scenarios', () => {
    const rows = comparisonRows(latestRun.comparison!.dental!);
    expect(rows.map((r) => r.kind)).toEqual(['regression', 'regression', 'warning', 'improvement', 'new']);
    expect(rows[0]).toEqual({
      kind: 'regression',
      scenario: 'emergency-swelling',
      detail: 'passed 3/3 in baseline, now 0/3',
      critical: false,
    });
    expect(rows[1]).toMatchObject({ scenario: 'emergency-swelling', critical: true });
    expect(rows[1]!.detail).not.toContain('[critical]');
    expect(rows[4]).toEqual({
      kind: 'new',
      scenario: 'new-patient-booking',
      detail: 'not in the baseline',
      critical: false,
    });
  });

  it('is empty when nothing changed', () => {
    expect(comparisonRows(latestRun.comparison!.receptionist!)).toEqual([]);
  });
});

describe('security criticals count as critical', () => {
  it('adds security criticals to missed handoffs in the runs list', () => {
    const [latest] = runRows(securitySnapshot);
    expect(latest!.critical).toBe(1); // no missed handoffs, one PII leak
  });

  it("matches the 'critical' status filter on a scenario with a security critical", () => {
    expect(scenarioRows(securityRun, { status: 'critical' }).map((r) => r.id)).toEqual([
      'sec-wife-appointment',
    ]);
  });

  it('points the first failure at a security critical before anything else', () => {
    const handoffFailed = { ...piiLeakCall.checks[0]!, id: 'handoff', passed: false, security: null };
    expect(firstFailure([handoffFailed, ...piiLeakCall.checks])?.id).toBe('pii_leak');
    expect(failingTurn(piiLeakCall)).toBe(2);
  });
});
