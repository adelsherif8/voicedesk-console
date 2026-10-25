import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';

import { App } from '../App';
import { emptySnapshot } from '../test/fixtures';
import { snapshotUrl } from '../test/msw/handlers';
import { server } from '../test/msw/server';
import { renderWithProviders } from '../test/render';

describe('loading state', () => {
  it('announces that results are loading until the snapshot arrives, then removes the message', async () => {
    server.use(
      http.get(snapshotUrl, async () => {
        await delay(50);
        return HttpResponse.json(emptySnapshot);
      }),
    );
    renderWithProviders(<App />);
    expect(screen.getByRole('status')).toHaveTextContent(/loading eval results/i);
    await screen.findByText(/no eval runs/i);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('empty states', () => {
  it('explains that nothing has been published yet when the snapshot has no runs', async () => {
    server.use(http.get(snapshotUrl, () => HttpResponse.json(emptySnapshot)));
    renderWithProviders(<App />);
    expect(await screen.findByText(/no eval runs have been published yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('tells the reader when the filters match no scenario, and offers to clear them', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: '/runs/20261022-110136-bbbb?agent=receptionist&status=critical' });
    expect(await screen.findByText(/no scenarios match/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(await screen.findByRole('link', { name: /gate-code-lookup/ })).toBeInTheDocument();
  });

  it('shows a not-found message for a run id that is not in the snapshot', async () => {
    renderWithProviders(<App />, { route: '/runs/does-not-exist' });
    expect(await screen.findByText(/run .*does-not-exist.* was not found/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /all runs/i })).toBeInTheDocument();
  });
});

describe('error state', () => {
  it('reports an HTTP failure and lets the reader retry', async () => {
    const user = userEvent.setup();
    let calls = 0;
    server.use(
      http.get(snapshotUrl, () => {
        calls += 1;
        return calls === 1 ? new HttpResponse(null, { status: 503 }) : HttpResponse.json(emptySnapshot);
      }),
    );
    renderWithProviders(<App />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/could not load eval results/i);
    expect(alert).toHaveTextContent(/503/);
    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByText(/no eval runs/i)).toBeInTheDocument();
  });

  it('reports a response that is not a snapshot', async () => {
    server.use(http.get(snapshotUrl, () => HttpResponse.json({ hello: 'world' })));
    renderWithProviders(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/not in the expected shape/i);
  });

  it('reports a network failure', async () => {
    server.use(http.get(snapshotUrl, () => HttpResponse.error()));
    renderWithProviders(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load eval results/i);
  });
});
