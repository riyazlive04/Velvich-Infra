# Velvich Infra CRM — Product Specification

**Prepared by:** Sirah Digital
**Prepared for:** Velvich Infra (Er. V. Udhayakumar, Founder & CEO · Salem, Tamil Nadu)
**Version:** 1.0 — Decision-locked build baseline
**Date:** 21 June 2026
**Companion document:** `Velvich_Infra_CRM_Claude_Code_Master_Prompt.md`

---

## 0. How to read this document

This is a **decision-locked specification**. Choices marked **[LOCKED]** are final for this build and should not be re-litigated during development; they exist so the build can proceed without ambiguity. Items marked **[PHASE 2]** / **[PHASE 3]** are in scope but deferred. The **Out of Scope** list (§13) is binding — anything not listed in scope is excluded until agreed in writing.

---

## 1. Product in one line

A secure, multi-user, web-based **project, collections and operations system** for a government-infrastructure & survey consultancy — capturing the firm's existing workflow (projects, milestone-based government payments, staff, field activity and documents) on a dependable foundation, with **granular owner-controlled access** and an **AI assist layer that minimises manual data entry**.

It replaces a client-built HTML prototype that stored all data in a public JSON store behind a shared, plaintext API key.

---

## 2. Guiding principles (the spirit of the build)

1. **Flexible and easy first.** Minimal required fields, smart defaults, inline creation, global quick-add, search everywhere, mobile-first. The fastest path to logging something correctly should be the obvious one.
2. **Reduce manual entry — never remove it.** AI can read a receipt, parse a typed/spoken line, pre-fill and suggest. Every AI output is a **draft the user confirms**, and a **full manual form is always available** as the fallback. Nothing posts to the ledger without a human OK.
3. **Owner controls access, feature by feature.** Roles are presets; the Owner can grant or revoke access to any feature for any user, per user, at any time.
4. **Trustworthy with money and documents.** Real authentication, per-user accountability (audit trail), server-enforced permissions, automated backups. This is the non-negotiable that the prototype failed.
5. **Derived data is never typed.** Collection %, profit/loss, ledger balances and receivable aging are always computed, never hand-entered.
6. **Lean by intent.** Build what the firm will use. Defer or drop anything that does not earn its place (see §13).

---

## 3. Users & access model

### 3.1 Personas
- **Owner / Principal** — the founder. Full visibility and control; manages users and permissions.
- **Manager** — runs projects day to day; broad operational access.
- **Accounts / Office** — logs money, documents, invoices; manages collections.
- **Field engineer / surveyor** — mobile-first; logs activity, updates stage, uploads documents/photos.
- **Viewer** — read-only.

### 3.2 Permission model **[LOCKED]**

Permissions are **capabilities** expressed as `resource:action`, e.g. `projects:create`, `transactions:edit`, `accounts:view`, `documents:delete`, `reports:export`, `users:manage`, `permissions:manage`, `tenders:view`.

- **Roles are presets**, not hard limits. Each role (Owner, Manager, Accounts, Field, Viewer) ships with a sensible default capability set.
- **Per-user overrides** let the Owner **ALLOW** or **DENY** any individual capability for any individual user, on top of their role.
- **Effective permission = role defaults ∪ user ALLOW overrides − user DENY overrides.** An explicit override always wins over the role default.
- **Owner is absolute:** always holds every capability and can never be locked out. At least one Owner must always exist.
- **Enforced on the server** (guards on every protected action) and **reflected in the UI** (hidden/disabled controls). The server is the source of truth — the UI is a convenience.
- **Every permission change is audited** (who changed whose access, when, what).

The Owner manages this through a **per-user permission matrix**: capabilities grouped by module, each toggle showing whether it is inherited from the role or explicitly overridden.

---

## 4. Reducing manual entry — the assist layer **[LOCKED behaviour]**

All of the following exist to cut typing. **All produce editable drafts requiring confirmation; the manual form is always present.**

| Assist | What it does | Phase |
|---|---|---|
| **Receipt / bill capture** | Snap or upload a bill (image/PDF) → Claude extracts amount, date, vendor, suggested category and likely project → user confirms in one tap. | Phase 1 |
| **Natural-language quick add** | Type or speak `"₹4,500 diesel for Rasipuram bypass yesterday"` → parsed into a draft income/expense for confirmation. | Phase 1 |
| **Smart defaults & memory** | Date defaults to today; last-used project pre-selected; category suggestions; Indian-format currency; remembers per-user habits. | Phase 1 |
| **Inline create** | Create a client or staff member from inside the project form without leaving it. | Phase 1 |
| **Global quick-add** | One “+” anywhere → add a project, income, expense, activity or document. | Phase 1 |
| **Bulk import** | Import clients, staff, projects and transactions from Excel/CSV (also used for prototype migration). | Phase 1 (migration) / Phase 2 (self-serve UI) |
| **Recurring templates** | Office rent, salaries, retainer income auto-generate monthly **draft** entries to confirm. | Phase 2 |
| **Auto-derived figures** | Collection %, P&L, ledger balances, aging — always computed. | Phase 1 |
| **WhatsApp capture** | Forward a bill photo / send a line to a number → logged as a draft. | Phase 3 |

The AI provider sits behind an **abstracted AI service** (Anthropic Claude); the model is configurable and can be swapped without touching feature code.

---

## 5. Technology stack **[LOCKED]**

| Layer | Choice | Notes |
|---|---|---|
| Frontend | **Next.js 14 (App Router) + TypeScript** | Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form + Zod. Mobile-first responsive. |
| Backend | **NestJS (TypeScript)** | Modular monolith. |
| Database | **PostgreSQL + Prisma ORM** | Per-record relational data (not a JSON blob). |
| Auth | **Better Auth** | Email/phone + password; sessions; password reset via email. |
| Jobs/queue | **Redis + BullMQ** | OCR/extraction, exports, reminders, recurring entries. |
| File storage | **Cloudflare R2** (S3-compatible) | Private buckets, signed URLs, role-checked downloads. |
| AI layer | **Anthropic Claude SDK** behind `AiService` | Receipt extraction, NL parsing, summaries. |
| Email | **Resend** | Invites, password reset, reminders. |
| Notifications | In-app (Phase 1), email (Phase 2), **WhatsApp via Meta Cloud API** (Phase 3) | Meta Cloud API direct — no Baileys/unofficial bridges. |
| Exports | **ExcelJS** (xlsx) + server-side **PDF** | Transactions, accounts, ledger, invoices/statements. |
| Hosting | **Hostinger VPS**, Docker Compose | India region. Services: web, api, postgres, redis, reverse proxy (Caddy/Nginx). |
| Backups | **Automated daily `pg_dump` → Cloudflare R2**, retained ≥30 days | Restore procedure documented. |

**Explicit non-choices (and why):**
- **No payment gateway / Razorpay.** Velvich bills government departments on milestones; the system *tracks* money, it does not collect online payments. Dropped to avoid needless cost and scope.
- **No multi-tenant / reselling.** Single organisation.
- **No native mobile app.** Responsive web first.

---

## 6. Modules & functional scope

> Tags: **[KEEP]** carries over proven prototype behaviour · **[NEW]** fills a gap · **[REPLACE]** replaces an unsafe prototype mechanism.

### 6.1 Authentication & onboarding — Phase 1
- Per-user login (email/phone + password); password reset. **[REPLACE]** shared keys.
- First-run: create the Owner and the organisation profile (name, address, GST/PAN, logo).

### 6.2 Users, roles & permissions — Phase 1
- Invite, deactivate and reset users. **[NEW]**
- Role presets + **per-user capability overrides** (the permission matrix). **[NEW]**
- Full audit trail of all changes. **[NEW]**

### 6.3 Clients & departments — Phase 1
- Clients with name, department type (PWD, TNRD, Highways Dept, Rural Development, NHAI, Municipality, Private), city, contact. **[KEEP]**
- **Multiple contacts per department** (e.g. Executive Engineer, AE) with phone/email/notes. **[NEW]**
- Project count per client. **[KEEP]**

### 6.4 Tenders & leads (front of funnel) — **[PHASE 2] [NEW]**
- Track tenders/EOIs: department, work description, estimated value, **submission deadline**, EMD/security deposit, status (Identified → Preparing → Submitted → Won → Lost). Convert a won tender into a Project in one step. (Added because government work is won through tenders; deferred to keep the MVP lean.)

### 6.5 Projects & pipeline — Phase 1
- Create with name, type (Highway, Bypass, Bridge, Grade Separator, Ghat Road, ROB/RUB/HLB, Railway Bridge, Plot Layout, Traffic Study, DGPS Survey, DPR, Land Survey — Agriculture/Residential/Hill, Other), department, district, client, contract amount, stage, start date, notes. **Only name + type required**; everything else optional. **[KEEP + flexibility]**
- 8-stage pipeline + On Hold, with visual timeline and **Kanban** board. **[KEEP]**
- **Stage history** (when each stage was reached, by whom) and stage-change notes. **[KEEP/NEW]**
- **Expected payment milestones** with target dates (drives collections). **[NEW]**
- Optional work-order number, sanction reference, expected completion. **[NEW]**

### 6.6 Staff & allocation — Phase 1
- Staff with name, role, phone, skills. **[KEEP]**
- Assign multiple staff to a project; show active vs total load; flag over-allocation. **[KEEP/NEW]**

### 6.7 Transactions (income & expense) — Phase 1
- Log income/expense with category, description, linked project (optional), amount, date, reference. **[KEEP]**
- Income status (Received/Pending); expense paid-via (Cash/Bank/Cheque/UPI). **[KEEP]**
- **Receipt capture + natural-language quick add** (see §4). **[NEW]**
- Attach a bill/receipt file. Optional GST fields (taxable value, GST %, TDS). **[NEW]**
- Categories are **editable in Settings** (start from the prototype's lists). **[NEW/flexibility]**

### 6.8 Project accounts (auto P&L) — Phase 1
- Per project: contract amount, income received, expense spent, net profit/loss, collection %. All **computed**. **[KEEP]**

### 6.9 Monthly ledger (passbook) — Phase 1
- Opening balance, credits, debits, closing balance and running statement for a chosen month. **[KEEP]**

### 6.10 Receivables / collections — Phase 1 (view) / **[PHASE 2]** (automation)
- Receivables view across projects, sorted by age/overdue. **[NEW]**
- Overdue flags; reminders (in-app → email → WhatsApp by phase). **[NEW]**
- Follow-up log per receivable (who, when, outcome). **[NEW]**

### 6.11 Activity log — Phase 1
- Log activities (site survey, client meeting, government office visit, DPR submission, drawing review, payment follow-up, call, inspection, internal meeting) with project, staff, date, notes. **[KEEP]**
- **Mobile quick-log with optional photo.** **[NEW]**

### 6.12 Documents — Phase 1
- **Real managed storage on R2** (upload/download/delete), per project, **role-checked**, not public links. **[REPLACE]**
- Supports PDF, image, Word, Excel, DWG. **[KEEP]**
- Categories (survey data, drawings, DPR, sanction order, correspondence) + basic version history. **[NEW]**

### 6.13 Dashboard — Phase 1
- Active projects, income/expense/net, recent transactions, quick actions. **[KEEP]**
- **Receivables/overdue summary** and **deadline alerts.** **[NEW]**

### 6.14 Reports & exports — Phase 1 (basic) / **[PHASE 2]** (invoices/statements)
- Excel/PDF exports for transactions, project accounts, monthly ledger. **[NEW]**
- Generate a simple **invoice / payment request** and **project statement** for a client. **[PHASE 2]**

### 6.15 Notifications & reminders — Phase 1 (in-app) → Phase 2/3
- Overdue collections, projects stuck at a stage, upcoming submission/milestone dates.

### 6.16 Settings — Phase 1
- Organisation profile; editable categories, project types, stages and roles; permission management; backup status.

### 6.17 Audit log — Phase 1
- Tamper-evident record of create/edit/delete across projects, finances, documents, users and permissions.

### 6.18 Import / migration — Phase 1
- Import the prototype's JSON export (clients, staff, projects, transactions, activities; re-link documents) and Excel/CSV. Reconcile balances against the prototype before go-live.

---

## 7. Data model (overview)

Core entities (full Prisma schema lives in the master prompt):

- **User** — name, email/phone, role, status, last login.
- **Role** + **UserPermissionOverride** (ALLOW/DENY per capability).
- **Organization** — profile, GST/PAN, logo, settings (editable categories/types/stages).
- **Client** — name, department type, city; **Contact** (many per client).
- **Tender** *(Phase 2)* — dept, value, deadline, EMD, status; converts to Project.
- **Project** — type, dept, district, contract amount, stage, dates, milestones, notes; **StageHistory**; **ProjectStaff** (assignment).
- **Staff** — name, role, phone, skills.
- **Transaction** — type, category, amount, date, status/paid-via, reference, GST fields, optional receipt file, optional project.
- **Receivable** — derived/explicit expected amount, due date, status, **FollowUp** entries.
- **Activity** — type, date, notes, optional photo; links to project/staff.
- **Document** — file (R2 key), category, version, uploaded-by; links to project.
- **AuditEntry** — actor, action, entity, before/after, timestamp.

---

## 8. UX principles **[LOCKED]**
- **Mobile-first responsive**; field flows usable one-handed.
- **Minimal required fields**; advanced fields behind progressive disclosure.
- **Global quick-add** and **search everywhere**.
- **Inline create** of related records.
- Clear empty states with the next action.
- Indian number/currency formatting (₹, lakh/crore where natural).
- Bilingual (English + Tamil) labels **[PHASE 3]**.

---

## 9. Non-functional requirements
- **Security:** hashed passwords, server-enforced permissions, encrypted in transit and at rest, signed document URLs, no secrets in client code.
- **Data integrity:** relational records; safe concurrent edits; no silent overwrite/loss.
- **Availability:** automated daily backups + documented restore; target 99.5%+.
- **Performance:** common screens < 2s at expected volumes; smooth on a mid-range phone.
- **Compliance:** align with India's DPDP Act; data residency in India.
- **Auditability:** complete change log.
- **Maintainability:** standard documented stack; typed end to end.

---

## 10. Phasing

**Phase 1 — Secure MVP (replace the prototype safely):** Auth; Users/Roles/granular permissions; Clients; Projects + pipeline + Kanban; Staff; Transactions with **receipt capture + NL quick-add**; Project Accounts; Monthly Ledger; Receivables view; Activity Log (mobile + photo); Documents (R2); Dashboard; basic Reports/Exports; Settings; Audit; Import/migration. Mobile-responsive throughout.

**Phase 2 — Collections, tenders & paperwork:** Tenders & Leads; receivables reminders (email); invoice/statement generation; recurring templates; self-serve bulk import; advanced reports.

**Phase 3 — Automation & polish:** WhatsApp capture + reminders (Meta Cloud API); voice quick-add polish; charts/trends; Tamil/bilingual UI; optional GST/Tally export.

---

## 11. Migration plan
1. Export prototype JSON from JSONBin; review completeness.
2. Map fields to the new model; import clients, staff, projects, transactions, activities.
3. Re-link documents.
4. Reconcile per-project balances and the monthly ledger against the prototype.
5. **Rotate/delete the exposed JSONBin key** and decommission the prototype.

---

## 12. Acceptance criteria (Phase 1 “done”)
- Each user logs in with their own credentials; no shared keys anywhere.
- Owner can grant/revoke any capability for any user; changes take effect immediately and are audited; restricted controls are hidden/disabled and blocked server-side.
- A user can log an expense by photographing a bill, confirming the extracted draft — and can also log it fully manually.
- Projects, pipeline, accounts, ledger and receivables reflect the prototype's behaviour with correct computed figures.
- Documents upload to R2 and are downloadable only by permitted users.
- Prototype data is migrated and balances reconcile.
- Automated daily backup runs and a restore has been verified.
- Fully usable on a phone.

---

## 13. Out of scope (binding)
- Full double-entry accounting / live Tally integration (export only, Phase 3 optional).
- Government e-tender portal integration / automated bid scraping.
- CAD / GIS / DGPS data processing inside the system.
- Native iOS/Android apps.
- Multi-tenant / multi-company / reselling.
- Payroll processing (staff records yes; salary runs no).
- Online payment collection / payment gateway.

---

## 14. Open items to confirm before/at build kickoff
1. Expected user count and the roles each person needs.
2. Typical government payment schedule (advance %, interim, final, retention) to model milestones.
3. Whether formal GST invoices are needed from the system or internal tracking only.
4. Reminder channels and recipients.
5. Tamil interface priority.
6. Phase 1 budget/timeline to confirm the recommended stack vs. a leaner option.
