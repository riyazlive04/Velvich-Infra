# Deploying the demo to Vercel (free) + Neon Postgres

This deploys the CRM as **two Vercel projects** (web + API serverless) backed by a
free **Neon** Postgres. The web app proxies `/api/*` to the API, so the Better
Auth session cookie stays same-origin in the browser (same pattern as local dev).

```
Browser ──▶ velvich-web.vercel.app ──(/api/* rewrite)──▶ velvich-api.vercel.app ──▶ Neon Postgres
```

> All free tier. First request after idle has a small serverless cold start.

---

## 0. Prerequisites (the two things only you can provide)

1. A **Vercel** account — run `vercel login` once in your terminal (the CLI then
   stores auth that the deploy commands reuse).
2. A free **Neon** Postgres database — sign up at <https://neon.tech>, create a
   project, and copy **two** connection strings from the dashboard:
   - **Pooled** (host contains `-pooler`) → used at runtime (`DATABASE_URL`).
   - **Direct** (no `-pooler`) → used once to run migrations.

Generate an auth secret now (keep it safe):
```bash
openssl rand -base64 48
```

---

## 1. Run migrations against Neon (once)

From the repo root, using the **direct** Neon URL:
```bash
DATABASE_URL="postgresql://USER:PASS@ep-xxx.REGION.aws.neon.tech/neondb?sslmode=require" \
  pnpm --filter @velvich/api exec prisma migrate deploy

# optional: seed the demo org + owner + sample data
DATABASE_URL="postgresql://USER:PASS@ep-xxx.REGION.aws.neon.tech/neondb?sslmode=require" \
SEED_OWNER_EMAIL="owner@velvichinfra.test" SEED_OWNER_PASSWORD="Owner@12345" \
  pnpm --filter @velvich/api prisma:seed
```

---

## 2. Deploy the API project

```bash
cd apps/api
vercel link        # create/link a project, e.g. name it "velvich-api"
vercel --prod
```

Set these **Environment Variables** on the `velvich-api` project (Vercel dashboard
→ Settings → Environment Variables, or `vercel env add`). Use the **pooled** URL:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Neon **pooled** connection string (`...-pooler...?sslmode=require`) |
| `USE_NEON` | `true` |
| `BETTER_AUTH_SECRET` | the secret from step 0 |
| `BETTER_AUTH_URL` | `https://velvich-api.vercel.app` (this API's own URL) |
| `API_ORIGIN` | `https://velvich-api.vercel.app` |
| `WEB_ORIGIN` | `https://velvich-web.vercel.app` (set after step 3, then redeploy) |
| `AI_ENABLED` | `false` |
| `NODE_ENV` | `production` |

Redeploy after setting vars: `vercel --prod`.

---

## 3. Deploy the web project

```bash
cd ../web
vercel link        # name it "velvich-web"
vercel --prod
```

Environment variables on `velvich-web`:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_ORIGIN` | `https://velvich-api.vercel.app` |
| `NEXT_PUBLIC_APP_NAME` | `Velvich Infra CRM` |

The web app's `next.config.mjs` rewrites `/api/*` to `NEXT_PUBLIC_API_ORIGIN`.

---

## 4. Wire the two together

1. Put the real web URL into the API's `WEB_ORIGIN` env var and redeploy the API
   (`cd apps/api && vercel --prod`). This is required — Better Auth only accepts
   requests whose Origin is in its trusted origins.
2. Open `https://velvich-web.vercel.app`.
   - With the seed: log in as `owner@velvichinfra.test` / `Owner@12345`.
   - Without the seed: the first visit routes to `/onboarding` to create the Owner.

---

## Vercel project settings (both projects)

- **Root Directory**: `apps/api` and `apps/web` respectively. Enable
  "Include source files outside of the Root Directory" (needed for the pnpm
  monorepo — Vercel usually detects this automatically).
- **Install / Build commands** come from each app's `vercel.json` (they build the
  shared package first, then `prisma generate` + `nest build` for the API).
- **Node.js Version**: 20.x.

---

## How it works / troubleshooting

- **No Prisma engine binary on Vercel.** With `USE_NEON=true` the API uses the
  Neon driver adapter (`@prisma/adapter-neon` + `@neondatabase/serverless`), so
  there is no native query engine to bundle — the usual cause of Prisma-on-Vercel
  failures. Locally (`USE_NEON` unset) it uses a normal client.
- **Cold starts**: the Nest app is built once per warm instance and cached
  (`apps/api/src/serverless.ts`), so only the first hit pays the start cost.
- **Cookies / auth**: the browser only ever talks to the web domain; the Next
  rewrite proxies to the API, so cookies are same-origin. If login "succeeds" but
  `/api/me` 401s, check that the API's `WEB_ORIGIN` exactly matches the web URL.
- **`migrate deploy` must use the DIRECT (non-pooled) Neon URL** — pooled
  (pgbouncer) connections can't run migrations.
- **AI & file uploads** stay disabled unless you also set `ANTHROPIC_API_KEY` /
  `R2_*` on the API project.
