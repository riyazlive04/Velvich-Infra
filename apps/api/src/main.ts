import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from './app.module';
import { getAuth } from './auth/auth.config';
import { mountBetterAuth } from './auth/node-adapter';
import { loadEnv } from './config/env';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

async function bootstrap() {
  const env = loadEnv();

  // bodyParser:false so the Better Auth handler can read the raw request body.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });

  app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });

  // Better Auth runs OUTSIDE the Nest pipeline (raw body), mounted before parsers.
  const expressApp = app.getHttpAdapter().getInstance();
  mountBetterAuth(expressApp, await getAuth());

  // JSON / urlencoded parsers for everything else (multipart handled by multer).
  app.use(express.json({ limit: `${env.MAX_UPLOAD_MB}mb` }));
  app.use(express.urlencoded({ extended: true }));

  app.setGlobalPrefix('api');
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(env.API_PORT);
  Logger.log(`API listening on ${env.API_ORIGIN} (port ${env.API_PORT})`, 'Bootstrap');
}

void bootstrap();
