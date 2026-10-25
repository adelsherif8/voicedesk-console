import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '../App';
import { renderWithProviders } from '../test/render';

describe('baseline comparison', () => {
  it('is reachable from the run page', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: '/runs/20261022-110136-bbbb' });
    await user.click(await screen.findByRole('link', { name: /compare with baseline/i }));
    expect(await screen.findByRole('heading', { name: /baseline comparison/i })).toBeInTheDocument();
  });

  it('shows, per agent, what got worse before what got better, with the baseline it compares against', async () => {
    renderWithProviders(<App />, { route: '/runs/20261022-110136-bbbb/compare' });
    const dental = await screen.findByRole('region', { name: /dental/i });

    expect(within(dental).getByText(/baseline 20261020-090000-aaaa/i)).toBeInTheDocument();
    expect(within(dental).getByText(/containment 75% → 50%/i)).toBeInTheDocument();

    const items = within(dental).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual([
      expect.stringMatching(/^Regression.*emergency-swelling.*passed 3\/3 in baseline, now 0\/3/),
      expect.stringMatching(/^Critical regression.*emergency-swelling.*missed handoff 3\/3/),
      expect.stringMatching(/^Warning.*changes-reschedule-twice/),
      expect.stringMatching(/^Improved.*off-topic-prank/),
      expect.stringMatching(/^New.*new-patient-booking/),
    ]);
    expect(within(dental).getAllByRole('link', { name: /emergency-swelling/ })[0]).toHaveAttribute(
      'href',
      '/runs/20261022-110136-bbbb/dental/emergency-swelling',
    );
  });

  it('says so when an agent has no changes against its baseline', async () => {
    renderWithProviders(<App />, { route: '/runs/20261022-110136-bbbb/compare' });
    const receptionist = await screen.findByRole('region', { name: /receptionist/i });
    expect(within(receptionist).getByText(/no change/i)).toBeInTheDocument();
  });

  it('explains when a run was not compared against a baseline', async () => {
    renderWithProviders(<App />, { route: '/runs/20261020-090000-aaaa/compare' });
    expect(await screen.findByText(/no baseline comparison was published/i)).toBeInTheDocument();
  });
});
