import type { Prisma } from '@prisma/client';

/**
 * Builds PrismaClient constructor options.
 *
 * - Local/Docker (default): a plain client over a TCP connection - works with
 *   any Postgres, no preview features needed at runtime.
 * - Serverless on Vercel (USE_NEON=true): the Neon driver adapter, which talks
 *   to Neon over its serverless driver instead of the Prisma query-engine
 *   binary. This is the reliable path on Vercel - nothing native to bundle.
 *
 * Both the app's PrismaService and Better Auth's own client use this so they
 * behave identically.
 */
export function buildPrismaOptions(): Prisma.PrismaClientOptions {
  if (process.env.USE_NEON !== 'true') return {};

  // Lazy-require so these deps are only loaded in the serverless path.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Pool, neonConfig } = require('@neondatabase/serverless');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaNeon } = require('@prisma/adapter-neon');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ws = require('ws');

  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaNeon(pool);
  return { adapter } as Prisma.PrismaClientOptions;
}
