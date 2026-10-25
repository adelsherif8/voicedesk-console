import { parseFilters, runRows, scenarioRows } from './selectors';
import { dentalSummary, latestRun, olderRun, snapshot } from '../test/fixtures';

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
