import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';

import { App } from '../App';
import { snapshotUrl } from '../test/msw/handlers';
import { server } from '../test/msw/server';
import { renderWithProviders } from '../test/render';
import { securitySnapshot } from '../test/securityFixtures';

const RUN = '20261025-082056-cccc';
const useSecuritySnapshot = () =>
  server.use(http.get(snapshotUrl, () => HttpResponse.json(securitySnapshot)));

/** The cell under a given column header, so assertions read as "the PII leaks of dental". */
function cellOf(row: HTMLElement, table: HTMLElement, header: RegExp) {
  const headers = within(table).getAllByRole('columnheader');
  const index = headers.findIndex((h) => header.test(h.textContent ?? ''));
  return within(row).getAllByRole('cell')[index - 1]!; // the agent is a row header, not a cell
}

describe('security view', () => {
  it('is reachable from the run page', async () => {
    useSecuritySnapshot();
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: `/runs/${RUN}` });
    await user.click(await screen.findByRole('link', { name: /^security$/i }));
    expect(await screen.findByRole('heading', { name: /^security/i, level: 1 })).toBeInTheDocument();
  });

  it('shows per agent: security calls, injection resistance, leaks, unauthorized tool calls and a verdict', async () => {
    useSecuritySnapshot();
    renderWithProviders(<App />, { route: `/runs/${RUN}/security` });
    const table = await screen.findByRole('table', { name: /security by agent/i });
    for (const name of [
      /security calls/i,
      /injection resistance/i,
      /prompt leaks/i,
      /pii leaks/i,
      /unauthorized tool calls/i,
      /verdict/i,
    ]) {
      expect(within(table).getByRole('columnheader', { name })).toBeInTheDocument();
    }
    const dental = within(table)
      .getByRole('rowheader', { name: /dental/i })
      .closest('tr')!;
    expect(cellOf(dental, table, /security calls/i)).toHaveTextContent('6');
    expect(cellOf(dental, table, /injection resistance/i)).toHaveTextContent('83%');
    expect(cellOf(dental, table, /prompt leaks/i)).toHaveTextContent('0');
    expect(cellOf(dental, table, /verdict/i)).toHaveTextContent('1 critical');

    const recovery = within(table)
      .getByRole('rowheader', { name: /recovery/i })
      .closest('tr')!;
    expect(cellOf(recovery, table, /verdict/i)).toHaveTextContent('no leak, 33% gave way');
    const receptionist = within(table)
      .getByRole('rowheader', { name: /receptionist/i })
      .closest('tr')!;
    expect(cellOf(receptionist, table, /verdict/i)).toHaveTextContent('held');
  });

  it('marks any leak or unauthorized tool call as critical, in text and not only colour', async () => {
    useSecuritySnapshot();
    renderWithProviders(<App />, { route: `/runs/${RUN}/security` });
    const table = await screen.findByRole('table', { name: /security by agent/i });
    const dental = within(table)
      .getByRole('rowheader', { name: /dental/i })
      .closest('tr')!;
    expect(cellOf(dental, table, /pii leaks/i)).toHaveTextContent(/1\s*critical/i);
    expect(cellOf(dental, table, /prompt leaks/i)).not.toHaveTextContent(/critical/i);
  });

  it('lists each security scenario with the OWASP LLM ids it covers, linked to its transcript', async () => {
    useSecuritySnapshot();
    renderWithProviders(<App />, { route: `/runs/${RUN}/security` });
    const table = await screen.findByRole('table', { name: /security scenarios/i });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(5);
    const arabic = rows.find((r) => r.textContent?.includes('Fake manager rule in Arabic'))!;
    expect(arabic).toHaveTextContent('LLM01');
    expect(arabic).toHaveTextContent('LLM07');
    expect(within(rows[0]!).getByRole('link', { name: /wife's appointment/i })).toHaveAttribute(
      'href',
      `/runs/${RUN}/dental/sec-wife-appointment`,
    );
    expect(rows[0]).toHaveTextContent(/1 critical/i);
  });

  it('explains every OWASP id it uses', async () => {
    useSecuritySnapshot();
    renderWithProviders(<App />, { route: `/runs/${RUN}/security` });
    const legend = await screen.findByRole('list', { name: /owasp/i });
    for (const text of [
      /LLM01.*prompt injection/i,
      /LLM02.*sensitive information disclosure/i,
      /LLM06.*excessive agency/i,
      /LLM07.*system prompt leakage/i,
      /LLM10.*unbounded consumption/i,
    ]) {
      expect(within(legend).getByText(text)).toBeInTheDocument();
    }
    expect(screen.getByText(/pii-redacted \(presidio\+ner\)/i)).toBeInTheDocument();
  });

  it('explains when the run predates the security track', async () => {
    useSecuritySnapshot();
    renderWithProviders(<App />, { route: '/runs/20261020-090000-aaaa/security' });
    expect(await screen.findByText(/predates the security track/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows a loading status, then an alert with retry if the snapshot fails', async () => {
    server.use(
      http.get(snapshotUrl, async () => {
        await delay(30);
        return new HttpResponse(null, { status: 500 });
      }),
    );
    renderWithProviders(<App />, { route: `/runs/${RUN}/security` });
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    expect(await screen.findByRole('alert')).toHaveTextContent(/500/);
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('shows a not-found message for an unknown run', async () => {
    useSecuritySnapshot();
    renderWithProviders(<App />, { route: '/runs/nope/security' });
    expect(await screen.findByText(/run .*nope.* was not found/i)).toBeInTheDocument();
  });
});
