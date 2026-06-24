import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { loadEnv } from '../config/env';
import { buildPrismaOptions } from '../prisma/prisma-options';

/**
 * Better Auth owns the credential lifecycle (sessions, password reset).
 * It uses its own Prisma client connection. The password hash lives in the
 * Account table; we configure bcryptjs so seeded hashes verify identically.
 *
 * `role` and `status` are server-controlled (input: false) - clients can never
 * self-assign a role at sign-up; the Owner sets roles via the users module.
 *
 * IMPORTANT: `better-auth` (and `better-auth/adapters/prisma`) ship ESM-only
 * (dist/index.mjs). This API compiles to CommonJS, so a static
 * `import { betterAuth } from 'better-auth'` is emitted as `require()` and
 * throws ERR_REQUIRE_ESM at runtime on Vercel. We instead load them through a
 * TRUE dynamic import() hidden behind `new Function` - tsc would otherwise
 * down-level a literal `import()` to `require()` under module:CommonJS, which
 * re-triggers the same error. The built instance is cached (one per cold start).
 */

// Pure type-level handles - `typeof import(...)` emits no runtime require().
type BetterAuthModule = typeof import('better-auth');
type PrismaAdapterModule = typeof import('better-auth/adapters/prisma');

// The concrete instance type (with our `role`/`status`/`phone` additional
// fields), inferred from buildAuth's return rather than the generic signature.
export type Auth = Awaited<ReturnType<typeof buildAuth>>;

// Force a real ESM dynamic import that tsc will not rewrite to require().
const esmImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<unknown>;

// Vercel's dependency tracer (nft) only follows STATIC require()/import
// specifiers. Our real load goes through `esmImport` above (to dodge tsc's
// require() down-leveling), which nft cannot see - so it tree-shakes
// better-auth out of the function bundle (ERR_MODULE_NOT_FOUND at runtime).
// This dead, never-executed branch gives nft the static specifiers it needs to
// include the package; the require() never runs, so it never throws
// ERR_REQUIRE_ESM. Do not remove.
/* c8 ignore start */
if ((globalThis as { __nft_keep_better_auth__?: boolean }).__nft_keep_better_auth__) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('better-auth');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('better-auth/adapters/prisma');
}
/* c8 ignore stop */

const env = loadEnv();
const authPrisma = new PrismaClient(buildPrismaOptions());

let authPromise: Promise<Auth> | null = null;

async function buildAuth() {
  const { betterAuth } = (await esmImport('better-auth')) as BetterAuthModule;
  const { prismaAdapter } = (await esmImport(
    'better-auth/adapters/prisma',
  )) as PrismaAdapterModule;

  return betterAuth({
    appName: 'Velvich Infra CRM',
    database: prismaAdapter(authPrisma, { provider: 'postgresql' }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    basePath: '/api/auth',
    trustedOrigins: [env.WEB_ORIGIN],
    emailAndPassword: {
      enabled: true,
      // Disable open self-registration - users are created by the Owner.
      disableSignUp: false,
      minPasswordLength: 8,
      password: {
        hash: (password: string) => bcrypt.hash(password, 12),
        verify: ({ hash, password }: { hash: string; password: string }) =>
          bcrypt.compare(password, hash),
      },
    },
    user: {
      additionalFields: {
        role: { type: 'string', required: false, defaultValue: 'VIEWER', input: false },
        status: { type: 'string', required: false, defaultValue: 'ACTIVE', input: false },
        phone: { type: 'string', required: false },
      },
    },
    session: {
      expiresIn: env.SESSION_MAX_AGE,
      cookieCache: { enabled: true, maxAge: 60 },
    },
    advanced: {
      cookiePrefix: 'velvich',
    },
  });
}

/** Lazily build and cache the Better Auth instance (loaded via dynamic ESM import). */
export function getAuth(): Promise<Auth> {
  if (!authPromise) authPromise = buildAuth();
  return authPromise;
}
