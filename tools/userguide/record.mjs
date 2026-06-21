/**
 * Records a short UI tour video (webm) for conversion to a GIF.
 *   node tools/userguide/record.mjs
 * Prereq: API on :4000 and web on :3000 with the dev seed + a non-owner user.
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, readdirSync, renameSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VID = join(__dirname, 'video');
mkdirSync(VID, { recursive: true });

const BASE = process.env.WEB_BASE ?? 'http://localhost:3000';
const EMAIL = process.env.SEED_OWNER_EMAIL ?? 'owner@velvichinfra.test';
const PASSWORD = process.env.SEED_OWNER_PASSWORD ?? 'Owner@12345';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const main = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: VID, size: { width: 1280, height: 800 } },
  });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await sleep(800);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await sleep(400);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 20000 }).catch(() => {});
  await sleep(1800);

  const visit = async (label, waitText) => {
    await page.getByRole('link', { name: label }).first().click().catch(() => {});
    if (waitText) await page.getByText(waitText, { exact: false }).first().waitFor({ timeout: 8000 }).catch(() => {});
    await sleep(1600);
  };

  await visit('Projects', 'Projects & Pipeline');
  await visit('Transactions', 'Transactions');
  await page.getByRole('button', { name: /AI add/i }).click().catch(() => {});
  await sleep(1800);
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(600);
  await visit('Accounts', 'Project Accounts');
  await visit('Users & Access', 'Users & Access');
  const perm = page.getByRole('button', { name: /Permissions/i }).last();
  if (await perm.count()) {
    await perm.click({ force: true }).catch(() => {});
    await page.getByText(/sets the defaults/i).first().waitFor({ timeout: 8000 }).catch(() => {});
    await sleep(2200);
    await page.keyboard.press('Escape').catch(() => {});
  }
  await sleep(800);

  await ctx.close(); // flush video
  await browser.close();

  const webm = readdirSync(VID).find((f) => f.endsWith('.webm'));
  if (webm) {
    const out = join(VID, 'tour.webm');
    renameSync(join(VID, webm), out);
    console.log(out);
  } else {
    console.error('no video produced');
    process.exit(1);
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
