import { expect, test } from '@playwright/test';

import { expectNoAxeViolations } from './axe';

// The fixture is voicedesk's real published snapshot: one full run for gpt-4o-mini with three agents.
const RUN = '20261022-110136-a4a4';

test.describe('runs list', () => {
  test('lists the published runs and has no accessibility violations', async ({ page }) => {
    await page.goto('/');
    const table = page.getByRole('table', { name: /eval runs/i });
    await expect(table).toBeVisible();
    await expect(table.getByRole('row')).toHaveCount(3); // header + 2 runs
    await expect(table.getByRole('columnheader', { name: /containment/i })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test('does not overflow the viewport width', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('table', { name: /eval runs/i }).waitFor();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('is operable with the keyboard alone', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('table', { name: /eval runs/i }).waitFor();
    // Tab from the top of the document until the first run link has focus, then open it with Enter.
    for (let i = 0; i < 10; i += 1) {
      await page.keyboard.press('Tab');
      const name = await page.evaluate(() => document.activeElement?.getAttribute('href') ?? '');
      if (name.startsWith('/runs/')) break;
    }
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/runs\/20261022-/);
    await expect(page.getByRole('heading', { name: /scenarios/i })).toBeVisible();
  });
});

test.describe('scenario filters', () => {
  test('keep agent and status in the URL and survive a reload', async ({ page }) => {
    await page.goto(`/runs/${RUN}`);
    await page.getByRole('combobox', { name: /agent/i }).selectOption('dental');
    await page.getByRole('combobox', { name: /status/i }).selectOption('failed');
    await expect(page).toHaveURL(/agent=dental/);
    await expect(page).toHaveURL(/status=failed/);
    await page.reload();
    await expect(page.getByRole('combobox', { name: /agent/i })).toHaveValue('dental');
    await expect(page.getByRole('combobox', { name: /status/i })).toHaveValue('failed');
    const rows = page.getByRole('table', { name: /scenarios/i }).getByRole('row');
    expect(await rows.count()).toBeGreaterThan(1);
    for (const cell of await rows.nth(1).getByRole('cell').allTextContents()) expect(cell).not.toBe('pass');
    await expectNoAxeViolations(page);
  });
});

test.describe('scenario detail', () => {
  test('shows the transcript with a highlighted failing turn for a failed scenario', async ({ page }) => {
    await page.goto(`/runs/${RUN}?status=failed`);
    await page
      .getByRole('table', { name: /scenarios/i })
      .getByRole('link')
      .first()
      .click();
    await expect(page.getByRole('list', { name: /transcript/i })).toBeVisible();
    await expect(page.getByRole('table', { name: /checks/i })).toBeVisible();
    await expect(page.getByText(/failing turn/i).first()).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test('attempt tabs respond to arrow keys', async ({ page }) => {
    await page.goto(`/runs/${RUN}?status=failed`);
    await page
      .getByRole('table', { name: /scenarios/i })
      .getByRole('link')
      .first()
      .click();
    const tabs = page.getByRole('tablist', { name: /attempts/i });
    await tabs.getByRole('tab').first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.getByRole('tab').nth(1)).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('baseline comparison', () => {
  test('renders per-agent changes with no accessibility violations', async ({ page }) => {
    await page.goto(`/runs/${RUN}/compare`);
    await expect(page.getByRole('heading', { name: /baseline comparison/i })).toBeVisible();
    await expect(page.getByRole('region', { name: /dental/i })).toBeVisible();
    await expect(page.getByRole('region', { name: /receptionist/i })).toBeVisible();
    await expect(page.getByRole('region', { name: /recovery/i })).toBeVisible();
    await expectNoAxeViolations(page);
  });
});

test.describe('error handling', () => {
  test('shows an alert with retry when the snapshot request fails', async ({ page }) => {
    await page.route('**/fixtures/published.json', (route) => route.fulfill({ status: 500 }));
    await page.goto('/');
    await expect(page.getByRole('alert')).toContainText(/could not load eval results/i);
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
    await expectNoAxeViolations(page);
  });
});
