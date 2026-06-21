# Multi-stage build for the Next.js web app (standalone output).
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

FROM base AS build
ARG NEXT_PUBLIC_API_ORIGIN
ARG NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_API_ORIGIN=$NEXT_PUBLIC_API_ORIGIN
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV BUILD_STANDALONE=1
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
COPY . .
RUN pnpm --filter @velvich/shared build && pnpm --filter @velvich/web build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
WORKDIR /repo/apps/web
EXPOSE 3000
CMD ["node", "server.js"]
