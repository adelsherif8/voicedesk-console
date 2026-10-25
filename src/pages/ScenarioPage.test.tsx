import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '../App';
import { renderWithProviders } from '../test/render';

const route = '/runs/20261022-110136-bbbb/dental/emergency-swelling';

describe('scenario detail', () => {
  it('shows the full transcript with the failing turn highlighted', async () => {
    renderWithProviders(<App />, { route });
    expect(
      await screen.findByRole('heading', { name: /facial swelling after extraction/i }),
    ).toBeInTheDocument();

    const transcript = screen.getByRole('list', { name: /transcript/i });
    const turns = within(transcript).getAllByRole('listitem');
    expect(turns).toHaveLength(5);
    expect(turns[0]).toHaveTextContent('Brightside Dental, this is Mia. How can I help?');
    expect(turns[1]).toHaveTextContent(/my face is swelling/i);

    const flagged = within(transcript)
      .getByText(/I can book you tomorrow at 9am/i)
      .closest('li');
    expect(flagged).toHaveAttribute('aria-current', 'true');
    expect(within(flagged!).getByText(/failing turn/i)).toBeInTheDocument();
    expect(turns[0]).not.toHaveAttribute('aria-current');
  });

  it('lists every check with its result and the judge reason', async () => {
    renderWithProviders(<App />, { route });
    const checks = await screen.findByRole('table', { name: /checks/i });
    const rows = within(checks).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(4);

    const handoff = within(rows.find((r) => r.textContent?.includes('handoff'))!);
    expect(handoff.getByRole('cell', { name: /failed/i })).toBeInTheDocument();
    expect(handoff.getByText('expected emergency, got none')).toBeInTheDocument();

    const grounded = within(rows.find((r) => r.textContent?.includes('grounded'))!);
    expect(grounded.getByRole('cell', { name: /judge/i })).toBeInTheDocument();
    expect(grounded.getByText(/invented a same-day slot/i)).toBeInTheDocument();

    const advisory = within(rows.find((r) => r.textContent?.includes('clean_end'))!);
    expect(advisory.getByRole('cell', { name: /advisory/i })).toBeInTheDocument();
  });

  it('switches between the k attempts, and shows the saved tool call on the turn that made it', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, { route });
    await screen.findByRole('heading', { name: /facial swelling/i });

    const attempts = screen.getByRole('tablist', { name: /attempts/i });
    expect(within(attempts).getAllByRole('tab')).toHaveLength(3);
    expect(within(attempts).getByRole('tab', { name: /attempt 1/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await user.click(within(attempts).getByRole('tab', { name: /attempt 3/i }));
    expect(within(attempts).getByRole('tab', { name: /attempt 3/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    const transcript = screen.getByRole('list', { name: /transcript/i });
    expect(within(transcript).getByText(/book_patient\(/)).toBeInTheDocument();
  });

  it('explains when transcripts were not published for that run', async () => {
    renderWithProviders(<App />, { route: '/runs/20261020-090000-aaaa/dental/emergency-swelling' });
    expect(await screen.findByText(/transcripts are only published for the latest run/i)).toBeInTheDocument();
  });
});
