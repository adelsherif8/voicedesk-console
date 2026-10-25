import { screen, within } from '@testing-library/react';

import { App } from '../App';
import { renderWithProviders } from '../test/render';

describe('runs list', () => {
  it('shows every eval run with its date, model, pass rate, containment and critical failures', async () => {
    renderWithProviders(<App />);

    const table = await screen.findByRole('table', { name: /eval runs/i });
    const rows = within(table).getAllByRole('row').slice(1); // drop the header row
    expect(rows).toHaveLength(2);

    const latest = within(rows[0]!);
    expect(latest.getByRole('link', { name: /22 Oct 2026, 08:01/ })).toBeInTheDocument();
    expect(latest.getByRole('cell', { name: 'gpt-4o-mini' })).toBeInTheDocument();
    expect(latest.getAllByRole('cell', { name: /67%/ })).toHaveLength(2); // pass rate and containment
    expect(latest.getByRole('cell', { name: /1 critical/ })).toBeInTheDocument();

    const older = within(rows[1]!);
    expect(older.getByRole('link', { name: /20 Oct 2026/ })).toBeInTheDocument();
    expect(older.getAllByRole('cell', { name: /100%/ })).toHaveLength(2);
    expect(older.getByRole('cell', { name: /none/i })).toBeInTheDocument();
  });

  it('labels the header columns so the table reads without the help text', async () => {
    renderWithProviders(<App />);
    await screen.findByRole('table', { name: /eval runs/i });
    for (const name of [/date/i, /model/i, /pass rate/i, /containment/i, /critical/i]) {
      expect(screen.getByRole('columnheader', { name })).toBeInTheDocument();
    }
  });
});
