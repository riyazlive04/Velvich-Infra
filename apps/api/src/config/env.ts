import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

// Load the repo-root .env for local dev. In Docker, env_file already populated
// process.env, so this is a harmless no-op (existing vars are not overridden).
for (const candidate of ['.env', '../../.env', '../../../.env']) {
  const path = resolve(process.cwd(), candidate);
  if (existsSync(path)) {
    loadDotenv({ path });
    break;
  }
}

/**
 * Validated environment. Fails fast on boot if a required secret is missing.
 * Read config through this - never `process.env` directly in feature code.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
  API_ORIGIN: z.string().url().default('http://localhost:4000'),

  DATABASE_URL: z.string().min(1),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  BETTER_AUTH_SECRET: z.string().min(16, 'BETTER_AUTH_SECRET must be at least 16 chars'),
  BETTER_AUTH_URL: z.string().url().default('http://localhost:4000'),
  SESSION_MAX_AGE: z.coerce.number().default(604800),

  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().default('velvich-crm'),
  R2_ENDPOINT: z.string().optional(),
  R2_SIGNED_URL_TTL: z.coerce.number().default(300),

  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default('claude-sonnet-4-6'),
  AI_MAX_TOKENS: z.coerce.number().default(2048),
  AI_TEMPERATURE: z.coerce.number().default(0),
  AI_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Velvich Infra CRM <noreply@velvichinfra.example>'),

  MAX_UPLOAD_MB: z.coerce.number().default(25),
  RATE_LIMIT_AUTH_PER_MIN: z.coerce.number().default(10),
  RATE_LIMIT_AI_PER_MIN: z.coerce.number().default(20),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
