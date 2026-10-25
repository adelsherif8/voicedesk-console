import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useLocation } from 'react-router-dom';

import { App } from '../App';
import { snapshotUrl } from '../test/msw/handlers';
import { server } from '../test/msw/server';
import { renderWithProviders } from '../test/render';
import { securitySnapshot } from '../test/securityFixtures';

const RUN = '20261025-082056-cccc';

function LocationProbe() {
  const { pathname, search } = useLocation();
  return <output data-testid="location">{pathname + search}</output>;
}

beforeEach(() => server.use(http.get(snapshotUrl, () => HttpResponse.json(securitySnapshot))));

describe('security scenarios in the scenario list', () => {
  it('filters to security scenarios from a select, kept in the URL', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <App />
        <LocationProbe />
      </>,
      { route: `/runs/${RUN}` },
    );
    const table = await screen.findByRole('table', { name: /scenarios/i });
    expect(within(table).getByRole('link', { name: /gate code/i })).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: /scenario type/i }), 'security');
    expect(screen.getByTestId('location')).toHaveTextContent(`/runs/${RUN}?track=security`);
    expect(screen.queryByRole('link', { name: /gate code/i })).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('table', { name: /scenarios/i }))
        .getAllByRole('row')
        .slice(1),
    ).toHaveLength(5);
  });

  it('shows the OWASP LLM ids of each security scenario and flags security criticals', async () => {
    renderWithProviders(<App />, { route: `/runs/${RUN}?track=security` });
    const table = await screen.findByRole('table', { name: /scenarios/i });
    const arabic = within(table)
      .getByRole('link', { name: /fake manager rule/i })
      .closest('tr')!;
    expect(arabic).toHaveTextContent('LLM01');
    expect(arabic).toHaveTextContent('LLM07');
    const wife = within(table)
      .getByRole('link', { name: /wife's appointment/i })
      .closest('tr')!;
    expect(wife).toHaveTextContent(/1 security critical/i);
  });
});

describe('security scenario detail', () => {
  it('shows the OWASP ids, marks the failed leak check as critical and highlights the leaking turn', async () => {
    renderWithProviders(<App />, { route: `/runs/${RUN}/dental/sec-wife-appointment` });
    expect(await screen.findByRole('heading', { name: /wife's appointment/i })).toBeInTheDocument();
    expect(screen.getByText(/LLM02/)).toBeInTheDocument();

    const checks = screen.getByRole('table', { name: /checks/i });
    const pii = within(checks).getByText('pii_leak').closest('tr')!;
    expect(within(pii).getByText(/critical/i)).toBeInTheDocument();
    const grounded = within(checks).getByText('grounded').closest('tr')!;
    expect(grounded).not.toHaveTextContent(/critical/i);

    const transcript = screen.getByRole('list', { name: /transcript/i });
    const current = within(transcript)
      .getAllByRole('listitem')
      .find((li) => li.getAttribute('aria-current') === 'true');
    expect(current).toHaveTextContent('T2');
  });
});
