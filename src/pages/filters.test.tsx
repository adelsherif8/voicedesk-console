import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';

import { App } from '../App';
import { renderWithProviders } from '../test/render';

function LocationProbe() {
  const { pathname, search } = useLocation();
  return <output data-testid="location">{pathname + search}</output>;
}

describe('agent filter on the runs list', () => {
  it('is read from the URL and narrows the metrics to that agent', async () => {
    renderWithProviders(<App />, { route: '/?agent=dental' });
    const table = await screen.findByRole('table', { name: /eval runs/i });
    const latest = within(within(table).getAllByRole('row')[1]!);
    expect(latest.getAllByRole('cell', { name: /50%/ })).toHaveLength(2);
    expect(screen.getByRole('combobox', { name: /agent/i })).toHaveValue('dental');
  });

  it('writes the chosen agent to the URL when changed', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <App />
        <LocationProbe />
      </>,
    );
    await screen.findByRole('table', { name: /eval runs/i });
    await user.selectOptions(screen.getByRole('combobox', { name: /agent/i }), 'receptionist');
    expect(screen.getByTestId('location')).toHaveTextContent('/?agent=receptionist');
    const latest = within(screen.getAllByRole('row')[1]!);
    expect(latest.getAllByRole('cell', { name: /100%/ })).toHaveLength(2);
  });
});

describe('scenario filters on a run', () => {
  it('shows every scenario of the run with its agent, status and attempts', async () => {
    renderWithProviders(<App />, { route: '/runs/20261022-110136-bbbb' });
    const table = await screen.findByRole('table', { name: /scenarios/i });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);
    const first = within(rows[0]!);
    expect(first.getByRole('link', { name: /facial swelling after extraction/i })).toBeInTheDocument();
    expect(first.getByRole('cell', { name: /fail/i })).toBeInTheDocument();
    expect(first.getByRole('cell', { name: '0/3' })).toBeInTheDocument();
  });

  it('applies agent and status from the URL and keeps them in sync with the selects', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <App />
        <LocationProbe />
      </>,
      { route: '/runs/20261022-110136-bbbb?agent=dental&status=passed' },
    );
    const table = await screen.findByRole('table', { name: /scenarios/i });
    expect(within(table).getAllByRole('row').slice(1)).toHaveLength(1);
    expect(screen.getByRole('link', { name: /new patient books a cleaning/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /status/i })).toHaveValue('passed');

    await user.selectOptions(screen.getByRole('combobox', { name: /status/i }), 'critical');
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/runs/20261022-110136-bbbb?agent=dental&status=critical',
    );
    expect(screen.getByRole('link', { name: /facial swelling after extraction/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /new patient books a cleaning/i })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: /agent/i }), '');
    expect(screen.getByTestId('location')).toHaveTextContent('/runs/20261022-110136-bbbb?status=critical');
  });
});
