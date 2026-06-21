# Velvich Infra CRM

A secure, multi-user, mobile-friendly **project, collections & operations system** for
Velvich Infra — a government-infrastructure & survey consultancy in Salem, Tamil Nadu.
It replaces an insecure HTML prototype with per-user authentication, owner-controlled
feature-level permissions, computed finances, document storage on Cloudflare R2, and an
AI assist layer that turns a photographed bill or a typed sentence into an **editable
draft** transaction.

> **Security first.** Per-user auth (hashed passwords, sessions), permissions enforced on
> the server for every protected action, signed private file URLs, no secrets in the
> client bundle, full audit trail. The UI mirrors permissions for convenience only — the
> API is the source of truth.

---

## Tech stack

| Layer    | Choice |
|----------|--------|
| Frontend | Next.js 14 (App Router) + TypeScript, Tailwind, TanStack Query, React Hook Form + Zod |
| Backend  | NestJS (modular monolith), REST, Zod DTO validation |
| Database | PostgreSQL + Prisma |
| Auth     | Better Auth (email + password, sessions, bcrypt hashing) |
| Queue    | Redis + BullMQ (scaffolded) |
| Files    | Cloudflare R2 (S3 SDK), private buckets, signed URLs |
| AI       | Anthropic Claude behind an `AiService` abstraction (model via env) |
| Exports  | ExcelJS (PDF scaffolded) |
| Infra    | Docker Compose (web, api, postgres, redis, caddy) |

---

## Repository layout

```
/apps
  /web        # Next.js 14 frontend
  /api        # NestJS API + Prisma schema/seed
/packages
  /shared     # permission constants, role presets, Zod schemas, money/date utils
/infra
  docker-compose.yml, Caddyfile, /scripts (backup.sh, restore.md)
.env.example
```

Money is stored as **integer paise** (BigInt) everywhere — never floats. Dates are stored
UTC and displayed in IST.

---

## Prerequisites

- Node.js ≥ 20, pnpm ≥ 9
- Docker (for Postgres/Redis, or the full stack)

## Quick start (local dev)

```bash
# 1. Install
pnpm install

# 2. Configure env
cp .env.example .env          # then edit secrets (DB password, BETTER_AUTH_SECRET, etc.)

# 3. Start Postgres + Redis
docker compose -f infra/docker-compose.yml --env-file .env up -d postgres redis

# 4. Create the schema and seed dev data
pnpm --filter @velvich/api prisma:migrate     # applies migrations
pnpm --filter @velvich/api prisma:seed        # org + owner + sample records

# 5. Run both apps (api on :4000, web on :3000)
pnpm --filter @velvich/shared build
pnpm dev
```

Open <http://localhost:3000>.

- **First run on an empty database** routes you to `/onboarding` to create the Owner.
- **With the dev seed**, log in at `/login` with `owner@velvichinfra.test` / `Owner@12345`.

> The web app proxies `/api/*` to the NestJS API (see `apps/web/next.config.mjs`) so the
> session cookie is same-origin in the browser.

---

## Environment variables

All variables live in [`.env.example`](.env.example) with inline notes. Key ones:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string |
| `BETTER_AUTH_SECRET` | ≥16-char session signing secret (`openssl rand -base64 48`) |
| `ANTHROPIC_API_KEY`, `AI_MODEL`, `AI_ENABLED` | AI assist; set `AI_ENABLED=false` to fall back to manual forms |
| `R2_*` | Cloudflare R2 credentials for documents/receipts (private bucket) |
| `RESEND_API_KEY` | Email (invites / reset) |
| `NEXT_PUBLIC_API_ORIGIN` | Where the web app proxies API calls |

Only `NEXT_PUBLIC_*` variables ever reach the browser.

---

## Permissions model

Capabilities are `resource:action` strings (e.g. `transactions:create`). Roles
(`OWNER`, `MANAGER`, `ACCOUNTS`, `FIELD`, `VIEWER`) are **presets**; the Owner can ALLOW or
DENY any capability per user via the **permission matrix** (Users & Access page).

`effective = rolePreset ∪ ALLOW-overrides − DENY-overrides`. An explicit override always
wins. **OWNER is absolute** and can never be locked out; at least one active Owner must
always exist. Every change is audited. The resolution logic lives in
[`packages/shared/src/permissions.ts`](packages/shared/src/permissions.ts) and is unit-tested.

Enforcement: `@RequirePermission('cap')` + `PermissionsGuard` on the API; `useCan()` /
`<Can>` on the web (convenience only).

---

## AI assist layer

`AiService` ([`apps/api/src/ai/ai.service.ts`](apps/api/src/ai/ai.service.ts)) wraps Claude
behind a provider-agnostic interface. Both methods return **editable drafts** — nothing is
ever auto-posted:

- **Receipt capture** — upload a bill → stored on R2 → Claude vision → `ReceiptDraft` →
  user confirms → `Transaction` with `source='receipt_ai'`.
- **NL quick-add** — `"₹4,500 diesel for Rasipuram bypass yesterday"` → `QuickEntryDraft` →
  confirm → `source='nl_ai'`.

When `AI_ENABLED=false` or no key is set, endpoints degrade gracefully to the manual form.

---

## Database, migrations & seed

```bash
pnpm --filter @velvich/api prisma:migrate     # dev: create/apply migrations
pnpm --filter @velvich/api prisma:deploy      # prod: apply existing migrations
pnpm --filter @velvich/api prisma:seed        # dev seed (skip in prod)
pnpm --filter @velvich/api db:reset           # DROP + recreate + seed (dev only)
```

## Prototype migration

`POST /api/import/prototype` (requires `settings:manage`) accepts a normalised JSON payload
(clients / staff / projects / transactions, with `ref` cross-links and optional
`expectedBalances`) and returns a **reconcile report** comparing imported per-project
income/expense to the prototype's recorded balances. See
[`apps/api/src/import/import.service.ts`](apps/api/src/import/import.service.ts). After
migrating, **rotate/delete the exposed JSONBin key** and decommission the prototype.

---

## Backups & restore

- `infra/scripts/backup.sh` — daily `pg_dump` → gzip → R2, with retention pruning. Schedule
  via cron (example inside the script).
- `infra/scripts/restore.md` — verified restore runbook. **A backup is only real once a
  restore has been proven** — run the drill monthly.

---

## Deploy to Hostinger VPS

1. Point a domain (e.g. `crm.velvichinfra.in`) at the VPS and set it in `infra/Caddyfile`
   (replace `:80`); Caddy auto-provisions HTTPS.
2. Copy the repo + a production `.env` to the VPS.
3. `docker compose -f infra/docker-compose.yml --env-file .env up -d --build`
   - The API container runs `prisma migrate deploy` on boot, then starts.
4. Create the Owner via `/onboarding` on first load.
5. Add the cron entry for `infra/scripts/backup.sh`.

---

## Scripts

| Command | What |
|---------|------|
| `pnpm dev` | Run all apps in watch mode |
| `pnpm build` | Build every workspace package |
| `pnpm typecheck` | Type-check all packages |
| `pnpm test` | Run unit tests (permission resolution, money math) |
| `pnpm --filter @velvich/api dev` | API only |
| `pnpm --filter @velvich/web dev` | Web only |

---

## Status & roadmap

**Phase 1 (this build):** auth + onboarding · users/roles/permission matrix · clients ·
staff · projects + Kanban pipeline · transactions (manual + receipt + NL) · computed
project accounts · monthly ledger · receivables + aging · activities · documents (R2,
permission-checked) · dashboard · Excel reports · settings · audit log · prototype import.

**Scaffolded for Phase 2/3:** Tenders model, recurring templates, WhatsApp (Meta Cloud
API), charts, Tamil/bilingual UI, PDF exports. Clean extension points and TODOs are left in
place. The standalone per-project **Documents** UI and BullMQ async receipt processing are
wired at the API level and are the first follow-ups on the web side.
