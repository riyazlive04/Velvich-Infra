/**
 * Captures screenshots of the running Velvich Infra CRM for the user guide.
 * Prereq: API on :4000 and web on :3000, with the dev seed applied.
 *
 *   node tools/userguide/capture.mjs
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHOTS = join(__dirname, 'shots');
mkdirSync(SHOTS, { recursive: true });

const BASE = process.env.WEB_BASE ?? 'http://localhost:3000';
const EMAIL = process.env.SEED_OWNER_EMAIL ?? 'owner@velvichinfra.test';
const PASSWORD = process.env.SEED_OWNER_PASSWORD ?? 'Owner@12345';

const shot = async (page, name) => {
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: false });
  console.log(`✓ ${name}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gotoPage(page, path, waitText) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  if (waitText) {
    await page.getByText(waitText, { exact: false }).first().waitFor({ timeout: 15000 }).catch(() => {});
  }
  await sleep(900);
}

const main = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 850 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  // 1) Login screen (unauthenticated)
  await gotoPage(page, '/login', 'Sign in');
  await shot(page, '01-login');

  // Authenticate
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 20000 }).catch(() => {});
  await sleep(1500);

  const pages = [
    ['/dashboard', 'Dashboard', '02-dashboard'],
    ['/projects', 'Projects & Pipeline', '03-projects-kanban'],
    ['/transactions', 'Transactions', '04-transactions'],
    ['/clients', 'Clients', '06-clients'],
    ['/staff', 'Staff', '07-staff'],
    ['/accounts', 'Project Accounts', '08-accounts'],
    ['/ledger', 'Monthly Ledger', '09-ledger'],
    ['/receivables', 'Receivables', '10-receivables'],
    ['/activities', 'Activity Log', '11-activities'],
    ['/users', 'Users & Access', '12-users'],
    ['/reports', 'Reports', '14-reports'],
    ['/settings', 'Settings', '15-settings'],
    ['/audit', 'Audit Log', '16-audit'],
  ];

  for (const [path, wait, name] of pages) {
    await gotoPage(page, path, wait);
    await shot(page, name);

    // Capture the AI assist modal on the transactions page.
    if (path === '/transactions') {
      await page.getByRole('button', { name: /AI add/i }).click().catch(() => {});
      await sleep(700);
      await shot(page, '05-transactions-ai');
      await page.keyboard.press('Escape').catch(() => {});
    }

    // Capture the permission matrix modal — use a NON-owner (owner's button is disabled).
    if (path === '/users') {
      const btn = page.getByRole('button', { name: /Permissions/i, includeHidden: false }).last();
      if (await btn.count()) {
        await btn.click({ force: true }).catch(() => {});
        // Wait for the matrix dialog content to render.
        await page.getByText(/sets the defaults/i).first().waitFor({ timeout: 8000 }).catch(() => {});
        await sleep(800);
        await shot(page, '13-permission-matrix');
        await page.keyboard.press('Escape').catch(() => {});
      }
    }
  }

  // Mobile view of the dashboard (mobile-first proof).
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const mpage = await mobile.newPage();
  // Reuse auth cookies.
  await mobile.addCookies(await ctx.cookies());
  await gotoPage(mpage, '/dashboard', 'Dashboard');
  await shot(mpage, '17-mobile-dashboard');

  await browser.close();
  console.log('Done — screenshots in tools/userguide/shots');
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
