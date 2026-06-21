import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { OnboardingController } from './onboarding.controller';

/**
 * Registers AuthGuard globally — every route is authenticated unless marked
 * @Public(). Better Auth's own HTTP handler is mounted in main.ts (it runs
 * outside Nest's pipeline so it can read the raw request body).
 */
@Module({
  controllers: [OnboardingController],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
})
export class AuthModule {}
