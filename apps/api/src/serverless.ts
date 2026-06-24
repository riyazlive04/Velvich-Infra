import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type Express } from 'express';
import { AppModule } from './app.module';
import { auth } from './auth/auth.config';
import { mountBetterAuth } from './auth/node-adapter';
import { loadEnv } from './config/env';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

/**
 * Serverless bootstrap for Vercel. Builds the NestJS app over an Express
 * instance ONCE per cold start and caches it, so subsequent invocations on the
 * same instance reuse it. Mirrors main.ts (Better Auth mounted with the raw
 * body before the JSON parser) but calls app.init() instead of app.listen().
 */
let cached: Express | null = null;
let building: Promise<Express> | null = null;

export async function getApp(): Promise<Express> {
  if (cached) return cached;
  if (building) return building;

  building = (async () => {
    const env = loadEnv();
    const server = express();
    const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
      bodyParser: false,
    });

    app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });

    // Better Auth runs outside Nest's pipeline (raw body), before the parsers.
    mountBetterAuth(server, auth);
    app.use(express.json({ limit: `${env.MAX_UPLOAD_MB}mb` }));
    app.use(express.urlencoded({ extended: true }));

    app.setGlobalPrefix('api');
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init(); // NOT listen() - Vercel owns the HTTP server
    cached = server;
    return server;
  })();

  return building;
}
