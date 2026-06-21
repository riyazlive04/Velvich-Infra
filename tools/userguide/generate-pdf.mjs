/**
 * Builds the Velvich Infra CRM user guide PDF from the captured screenshots.
 *   node tools/userguide/generate-pdf.mjs
 * Output: tools/userguide/Velvich-Infra-CRM-User-Guide.pdf
 */
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, writeFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHOTS = join(__dirname, 'shots');
const img = (name) => {
  const p = join(SHOTS, `${name}.png`);
  return existsSync(p) ? pathToFileURL(p).href : null;
};

const figure = (name, caption) => {
  const src = img(name);
  if (!src) return `<div class="missing">[screenshot ${name} not captured]</div>`;
  return `<figure><img src="${src}" alt="${caption}"/><figcaption>${caption}</figcaption></figure>`;
};

const section = (title, body) => `<section><h2>${title}</h2>${body}</section>`;

const roles = [
  ['Owner / Principal', 'Full control. Manages users, permissions, settings, audit. Can never be locked out.'],
  ['Manager', 'Runs projects day to day. Everything except user/permission/settings/audit administration.'],
  ['Accounts / Office', 'Logs money & documents, manages collections, exports reports.'],
  ['Field engineer / Surveyor', 'Mobile-first. Views/updates projects, logs activities, uploads documents.'],
  ['Viewer', 'Read-only across the system.'],
];

const html = `<!doctype html>
<html><head><meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1e293b; margin: 0; }
  .cover { height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;
    background: linear-gradient(135deg, #1d4ed8, #1e3a8a); color: white; text-align: center; padding: 40px; }
  .cover h1 { font-size: 44px; margin: 0 0 8px; }
  .cover p { font-size: 18px; opacity: 0.9; margin: 4px 0; }
  .cover .meta { margin-top: 40px; font-size: 14px; opacity: 0.8; }
  section { padding: 28px 48px; page-break-before: always; }
  h2 { color: #1d4ed8; font-size: 26px; border-bottom: 2px solid #dbeafe; padding-bottom: 8px; }
  h3 { color: #1e293b; font-size: 18px; margin-top: 22px; }
  p, li { font-size: 14px; line-height: 1.6; }
  figure { margin: 16px 0; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
  figure img { width: 100%; display: block; }
  figcaption { font-size: 12px; color: #64748b; padding: 8px 12px; background: #f8fafc; }
  ol, ul { padding-left: 22px; }
  table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 13px; }
  th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; vertical-align: top; }
  th { background: #eff6ff; }
  .tag { display: inline-block; background: #eff6ff; color: #1d4ed8; border-radius: 999px; padding: 2px 10px; font-size: 12px; font-weight: 600; }
  .note { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 10px 14px; font-size: 13px; border-radius: 6px; }
  .missing { color: #b91c1c; font-size: 12px; font-style: italic; }
  .toc li { margin: 6px 0; }
</style></head>
<body>
  <div class="cover">
    <h1>Velvich Infra CRM</h1>
    <p>User Guide — for all users</p>
    <div class="meta">
      <p>Project, collections &amp; operations system</p>
      <p>Salem, Tamil Nadu · Phase 1</p>
    </div>
  </div>

  ${section('1 · Introduction', `
    <p>The Velvich Infra CRM is a secure, mobile-friendly system for managing projects,
    government-payment collections, staff, field activity and documents. It replaces the
    old shared-key HTML prototype with <strong>per-user login</strong>,
    <strong>owner-controlled permissions</strong>, automatically computed finances, and an
    <strong>AI assist layer</strong> that turns a photographed bill or a typed sentence into
    an editable draft.</p>
    <h3>Who this guide is for</h3>
    <p>Every user, whatever their role. Sections are labelled with the
    <span class="tag">capability</span> needed; if you don't see a feature, your role or the
    Owner's settings haven't granted it.</p>
    <table>
      <tr><th>Role</th><th>What they can do</th></tr>
      ${roles.map(([r, d]) => `<tr><td><strong>${r}</strong></td><td>${d}</td></tr>`).join('')}
    </table>
    <div class="note">Roles are starting points. The Owner can grant or revoke any individual
    capability for any user at any time — see §5, Users &amp; Access.</div>
  `)}

  ${section('2 · Signing in & first-time setup', `
    <p>Open the CRM in any browser. On a brand-new system the first visitor is taken to
    <strong>Setup</strong> to create the organisation and the Owner account. After that,
    everyone signs in with their own email and password.</p>
    ${figure('01-login', 'The sign-in screen. Each user has their own credentials — no shared keys.')}
    <h3>Forgot your password?</h3>
    <p>Ask the Owner to reset it, or use the reset link (email). Never share a login.</p>
  `)}

  ${section('3 · Dashboard', `
    <p><span class="tag">dashboard:view</span></p>
    <p>Your landing page: active projects, income received, expenses, net, recent
    transactions, overdue receivables and upcoming payment milestones — all computed live.</p>
    ${figure('02-dashboard', 'Dashboard with money metrics, recent transactions and alerts.')}
  `)}

  ${section('4 · Projects & pipeline', `
    <p><span class="tag">projects:view</span> <span class="tag">projects:create</span> <span class="tag">projects:edit</span></p>
    <p>Track every project through 8 stages plus On&nbsp;Hold. Only <strong>name</strong> and
    <strong>type</strong> are required to create one — everything else is optional.</p>
    <h3>Using the Kanban board</h3>
    <ol>
      <li>Open <strong>Projects</strong>. Each column is a stage.</li>
      <li><strong>Drag a card</strong> to another column to move the project — the change and
      who made it are recorded in the stage history automatically.</li>
      <li>Switch to <strong>List</strong> view with the toggle if you prefer a table.</li>
    </ol>
    ${figure('03-projects-kanban', 'Kanban board — drag a project card between stages to update it.')}
    <h3>Creating a project (with inline client)</h3>
    <p>Click <strong>New project</strong>, fill name and type, optionally pick a client — or
    add one on the spot with the <strong>＋</strong> button without leaving the form.</p>
  `)}

  ${section('5 · Transactions — three ways to log money', `
    <p><span class="tag">transactions:view</span> <span class="tag">transactions:create</span></p>
    <p>Log income and expenses by <strong>photo</strong>, by <strong>sentence</strong>, or
    <strong>manually</strong> — all three produce the same result. Amounts always show in
    Indian rupees; totals (received, pending, expense, net) are computed.</p>
    ${figure('04-transactions', 'Transactions list with live totals and filters by type and month.')}
    <h3>AI assist (always an editable draft)</h3>
    <ol>
      <li>Click <strong>AI add</strong>.</li>
      <li><strong>Type a line</strong> like “₹4,500 diesel for Rasipuram bypass yesterday”, or
      <strong>upload/snap a bill</strong>.</li>
      <li>Review the draft the AI proposes — <strong>every field is editable</strong>.</li>
      <li>Confirm to save. Nothing is ever posted without your OK.</li>
    </ol>
    ${figure('05-transactions-ai', 'AI assist: type a sentence or snap a bill — both create an editable draft.')}
    <div class="note">If AI is turned off or unavailable, the full manual form is always there.</div>
  `)}

  ${section('6 · Clients & staff', `
    <p><span class="tag">clients:view</span> <span class="tag">staff:view</span></p>
    <p>Keep departments (PWD, TNRD, NHAI, …) with multiple contacts each, and track staff
    with their roles and project load. Over-allocated staff are flagged.</p>
    ${figure('06-clients', 'Clients with department type, contacts and project counts.')}
    ${figure('07-staff', 'Staff with roles and active/total project load.')}
  `)}

  ${section('7 · Money: accounts & monthly ledger', `
    <p><span class="tag">accounts:view</span> <span class="tag">ledger:view</span></p>
    <p>Per-project profit &amp; loss and collection&nbsp;% are computed from transactions —
    never typed. The monthly ledger shows opening balance, credits, debits, closing and a
    running statement; closing of one month equals the opening of the next.</p>
    ${figure('08-accounts', 'Project accounts — computed contract, income, expense, net and collection %.')}
    ${figure('09-ledger', 'Monthly ledger (passbook) with running balance. Switch months at the top.')}
  `)}

  ${section('8 · Receivables & collections', `
    <p><span class="tag">receivables:view</span> <span class="tag">receivables:manage</span></p>
    <p>See outstanding payments across projects, aged by due date. Log follow-ups (who, when,
    outcome) and mark a receivable received when the money arrives.</p>
    ${figure('10-receivables', 'Receivables aged by bucket, with follow-up logging.')}
  `)}

  ${section('9 · Activity log', `
    <p><span class="tag">activities:view</span> <span class="tag">activities:create</span></p>
    <p>Log site surveys, office visits, DPR submissions and more — quick on a phone, with an
    optional photo. Link each to a project and staff member.</p>
    ${figure('11-activities', 'Activity log — quick to add from the field.')}
  `)}

  ${section('10 · Users & Access (Owner)', `
    <p><span class="tag">users:manage</span> <span class="tag">permissions:manage</span></p>
    <p>The Owner invites users, sets roles, and — the key feature — controls
    <strong>any capability for any user</strong> through the permission matrix.</p>
    ${figure('12-users', 'Users list — invite, set role, activate/deactivate, open permissions.')}
    <h3>The permission matrix</h3>
    <ol>
      <li>Open a user and click <strong>Permissions</strong>.</li>
      <li>Each capability shows three choices: <strong>Inherited</strong> (from the role),
      <strong>Allow</strong>, or <strong>Deny</strong>.</li>
      <li>An explicit Allow/Deny always overrides the role default. Save — it takes effect on
      the user's next action and is recorded in the audit log.</li>
    </ol>
    ${figure('13-permission-matrix', 'Per-user permission matrix — grant or revoke any capability.')}
    <div class="note">The server enforces every permission independently. Hidden buttons are a
    convenience — security does not depend on the screen.</div>
  `)}

  ${section('11 · Reports & exports', `
    <p><span class="tag">reports:view</span> <span class="tag">reports:export</span></p>
    <p>Download Excel exports of transactions and the monthly ledger. (PDF statements come in
    a later phase.)</p>
    ${figure('14-reports', 'Excel exports for transactions and the monthly ledger.')}
  `)}

  ${section('12 · Settings & audit (Owner)', `
    <p><span class="tag">settings:manage</span> <span class="tag">audit:view</span></p>
    <p>Edit the organisation profile and the editable lists (project types, categories, stages,
    staff roles). The audit log is a tamper-evident record of every change to projects, money,
    documents, users and permissions.</p>
    ${figure('15-settings', 'Settings — organisation profile and editable lists.')}
    ${figure('16-audit', 'Audit log — who changed what, and when, with before/after detail.')}
  `)}

  ${section('13 · On your phone', `
    <p>The whole system is mobile-first. Field staff can update a project stage, log an
    activity with a photo, or snap a bill one-handed.</p>
    ${figure('17-mobile-dashboard', 'The dashboard on a phone — the navigation collapses into a menu.')}
  `)}

  ${section('14 · Good habits', `
    <ul>
      <li>Use your own login — never share credentials.</li>
      <li>Always review an AI draft before confirming it.</li>
      <li>Money figures (P&amp;L, collection %, balances, aging) are computed — don't try to
      hand-edit them; correct the underlying transactions instead.</li>
      <li>Owners: review the audit log periodically and keep at least one active Owner.</li>
    </ul>
  `)}
</body></html>`;

const main = async () => {
  // Write the HTML next to the screenshots so file:// <img> are same-origin.
  const htmlPath = join(__dirname, 'guide.html');
  writeFileSync(htmlPath, html, 'utf8');

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' });
  await page.waitForLoadState('load');
  const out = join(__dirname, 'Velvich-Infra-CRM-User-Guide.pdf');
  await page.pdf({
    path: out,
    format: 'A4',
    printBackground: true,
    margin: { top: '0', bottom: '0', left: '0', right: '0' },
  });
  await browser.close();
  console.log(`✓ User guide written to ${out}`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
