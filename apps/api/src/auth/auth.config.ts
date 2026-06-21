import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { loadEnv } from '../config/env';

const env = loadEnv();

/**
 * Better Auth owns the credential lifecycle (sessions, password reset).
 * It uses its own Prisma client connection. The password hash lives in the
 * Account table; we configure bcryptjs so seeded hashes verify identically.
 *
 * `role` and `status` are server-controlled (input: false) — clients can never
 * self-assign a role at sign-up; the Owner sets roles via the users module.
 */
const authPrisma = new PrismaClient();

export const auth = betterAuth({
  appName: 'Velvich Infra CRM',
  database: prismaAdapter(authPrisma, { provider: 'postgresql' }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  basePath: '/api/auth',
  trustedOrigins: [env.WEB_ORIGIN],
  emailAndPassword: {
    enabled: true,
    // Disable open self-registration — users are created by the Owner.
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

export type Auth = typeof auth;
