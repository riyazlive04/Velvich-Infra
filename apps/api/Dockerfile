# Multi-stage build for the NestJS API in a pnpm monorepo.
FROM node:20-alpine AS base
RUN corepack enable && apk add --no-cache openssl
WORKDIR /repo

# --- deps: install with the full workspace manifest set ---------------------
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile

# --- build ------------------------------------------------------------------
FROM base AS build
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY . .
RUN pnpm --filter @velvich/shared build \
  && pnpm --filter @velvich/api prisma:generate \
  && pnpm --filter @velvich/api build

# --- runtime ----------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages/shared/dist ./packages/shared/dist
COPY --from=build /repo/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/prisma ./apps/api/prisma
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
WORKDIR /repo/apps/api
EXPOSE 4000
# Apply migrations on boot, then start. (Safe: migrate deploy is idempotent.)
CMD ["sh", "-c", "node ../../node_modules/prisma/build/index.js migrate deploy && node dist/main.js"]
