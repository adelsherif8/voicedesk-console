// Captures the README screenshots from a running preview server: `npm run preview` then `node e2e/screenshot.mjs`.
import { chromium } from '@playwright/test';

const base = 'http://127.0.0.1:4173';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 });
await page.goto(`${base}/runs/20261022-110136-a4a4/compare`);
await page.getByRole('region').first().waitFor();
await page.screenshot({ path: 'docs/img/compare.png' });
await page.goto(`${base}/runs/20261022-110136-a4a4?status=failed`);
await page
  .getByRole('table', { name: /scenarios/i })
  .getByRole('link')
  .first()
  .click();
await page.getByRole('list', { name: /transcript/i }).waitFor();
await page.screenshot({ path: 'docs/img/scenario.png' });
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await phone.goto(`${base}/`);
await phone.getByRole('table').waitFor();
await phone.screenshot({ path: 'docs/img/phone.png' });
await browser.close();
