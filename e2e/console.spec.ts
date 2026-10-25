import { expect, test } from '@playwright/test';

import { expectNoAxeViolations } from './axe';

// The fixture is voicedesk's real published snapshot (voicedesk@56865f2): four runs, the latest with
// transcripts and the security track for three agents.
const RUN = '20261025-082056-2b8c-r';

test.describe('runs list', () => {
  test('lists the published runs and has no accessibility violations', async ({ page }) => {
    await page.goto('/');
    const table = page.getByRole('table', { name: /eval runs/i });
    await expect(table).toBeVisible();
    await expect(table.getByRole('row')).toHaveCount(5); // header + 4 runs
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
    await expect(page).toHaveURL(/\/runs\/\d{8}-\d{6}-/);
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
    await expect(page.getByRole('alert')).toContainText(/could not load eval results/i, { timeout: 10_000 });
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
    await expectNoAxeViolations(page);
  });
});

test.describe('dark mode', () => {
  test.use({ colorScheme: 'dark' });
  for (const path of ['/', `/runs/${RUN}`, `/runs/${RUN}/compare`]) {
    test(`has no accessibility violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.getByRole('heading', { level: 1 }).waitFor();
      await expectNoAxeViolations(page);
    });
  }

  test('scenario detail has no accessibility violations and no horizontal overflow', async ({ page }) => {
    await page.goto(`/runs/${RUN}?status=failed`);
    await page
      .getByRole('table', { name: /scenarios/i })
      .getByRole('link')
      .first()
      .click();
    await page.getByRole('list', { name: /transcript/i }).waitFor();
    await expectNoAxeViolations(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('security', () => {
  test('per-agent security table, OWASP scenarios and legend, with no accessibility violations', async ({
    page,
  }) => {
    await page.goto(`/runs/${RUN}`);
    await page.getByRole('link', { name: /^security$/i }).click();
    const agents = page.getByRole('table', { name: /security by agent/i });
    await expect(agents.getByRole('rowheader')).toHaveCount(3);
    await expect(agents.getByRole('columnheader', { name: /injection resistance/i })).toBeVisible();
    await expect(page.getByRole('table', { name: /security scenarios/i }).getByRole('row')).toHaveCount(22); // header + 21
    for (const id of ['LLM01', 'LLM02', 'LLM06', 'LLM07', 'LLM10']) {
      await expect(page.getByRole('list', { name: /owasp/i })).toContainText(id);
    }
    await expectNoAxeViolations(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('a run that predates the security track says so', async ({ page }) => {
    await page.goto('/runs/20261022-110136-a4a4/security');
    await expect(page.getByText(/predates the security track/i)).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test('the security filter survives a reload and opens a transcript with its OWASP ids', async ({
    page,
  }) => {
    await page.goto(`/runs/${RUN}`);
    await page.getByRole('combobox', { name: /scenario type/i }).selectOption('security');
    await expect(page).toHaveURL(/track=security/);
    await page.reload();
    const table = page.getByRole('table', { name: /scenarios/i });
    await expect(table.getByRole('row')).toHaveCount(22);
    await table
      .getByRole('link', { name: /someone else|stranger|cancel/i })
      .first()
      .click();
    await expect(page.getByText(/OWASP LLM: LLM06/)).toBeVisible();
    await expect(page.getByRole('table', { name: /checks/i })).toBeVisible();
    await expectNoAxeViolations(page);
  });
});

test.describe('security in dark mode', () => {
  test.use({ colorScheme: 'dark' });
  test('has no accessibility violations', async ({ page }) => {
    await page.goto(`/runs/${RUN}/security`);
    await page.getByRole('table', { name: /security by agent/i }).waitFor();
    await expectNoAxeViolations(page);
  });
});
