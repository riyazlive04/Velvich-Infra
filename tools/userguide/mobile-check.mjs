import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'mobile');
mkdirSync(OUT, { recursive: true });

const BASE = 'http://localhost:3000';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (p, n) => { await p.screenshot({ path: join(OUT, `${n}.png`), fullPage: true }); console.log('✓', n); };

const main = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'owner@velvichinfra.test');
  await page.fill('input[type="password"]', 'Owner@12345');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 20000 }).catch(() => {});
  await sleep(1200);

  const pages = [
    ['/projects', 'projects'],
    ['/transactions', 'transactions'],
    ['/accounts', 'accounts'],
    ['/ledger', 'ledger'],
    ['/clients', 'clients'],
    ['/users', 'users'],
    ['/audit', 'audit'],
    ['/settings', 'settings'],
  ];
  for (const [path, name] of pages) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    await sleep(1100);
    await shot(page, name);
  }

  // Open the nav drawer
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await sleep(600);
  await page.getByRole('button').first().click().catch(() => {});
  await sleep(600);
  await shot(page, 'nav-drawer');

  // Open the transactions manual form modal
  await page.goto(`${BASE}/transactions`, { waitUntil: 'networkidle' });
  await sleep(800);
  await page.getByRole('button', { name: /Manual/i }).click().catch(() => {});
  await sleep(800);
  await shot(page, 'txn-form-modal');

  // Open the AI modal
  await page.goto(`${BASE}/transactions`, { waitUntil: 'networkidle' });
  await sleep(600);
  await page.getByRole('button', { name: /AI add/i }).click().catch(() => {});
  await sleep(800);
  await shot(page, 'ai-modal');

  // Permission matrix modal (non-owner)
  await page.goto(`${BASE}/users`, { waitUntil: 'networkidle' });
  await sleep(800);
  const perm = page.getByRole('button', { name: /Permissions/i }).last();
  if (await perm.count()) { await perm.click({ force: true }).catch(() => {}); await sleep(1200); await shot(page, 'matrix-modal'); }

  await browser.close();
  console.log('done');
};
main().catch((e) => { console.error(e); process.exit(1); });
