import { runRows } from './selectors';
import { snapshot } from '../test/fixtures';

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
