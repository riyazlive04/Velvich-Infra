import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Post,
} from '@nestjs/common';
import { onboardingSchema, type OnboardingInput, DEFAULT_SETTINGS } from '@velvich/shared';
import { Prisma } from '@prisma/client';
import { getAuth } from './auth.config';
import { Public } from './public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ZodBody } from '../common/zod-validation.pipe';
import { AuditService } from '../audit/audit.service';

/**
 * First-run setup. Creates the Organization and the first OWNER. Permitted only
 * while the system has no users - once an Owner exists this is locked.
 */
@Controller('onboarding')
export class OnboardingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get('status')
  @Public()
  async status() {
    const userCount = await this.prisma.user.count();
    return { needsSetup: userCount === 0 };
  }

  @Post()
  @Public()
  async setup(@Body(new ZodBody(onboardingSchema)) dto: OnboardingInput) {
    const existing = await this.prisma.user.count();
    if (existing > 0) {
      throw new ConflictException('Setup already completed');
    }

    // Create the owner through Better Auth so the credential/account row is valid.
    const signUp = await (await getAuth()).api.signUpEmail({
      body: {
        email: dto.owner.email,
        password: dto.owner.password,
        name: dto.owner.name,
      },
    });
    if (!signUp?.user) {
      throw new BadRequestException('Failed to create owner account');
    }

    await this.prisma.user.update({
      where: { id: signUp.user.id },
      data: {
        role: 'OWNER',
        status: 'ACTIVE',
        emailVerified: true,
        phone: dto.owner.phone ?? null,
      },
    });

    const org = await this.prisma.organization.create({
      data: {
        name: dto.org.name,
        address: dto.org.address ?? null,
        gstin: dto.org.gstin ?? null,
        pan: dto.org.pan ?? null,
        settings: DEFAULT_SETTINGS as unknown as Prisma.InputJsonValue,
      },
    });

    await this.audit.log({
      actorId: signUp.user.id,
      action: 'CREATE',
      entity: 'Organization',
      entityId: org.id,
      after: { name: org.name },
    });

    return { ok: true, ownerId: signUp.user.id, organizationId: org.id };
  }
}
