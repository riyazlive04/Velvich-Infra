import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { DEFAULT_SETTINGS } from '@velvich/shared';
import { Prisma } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Open to any authenticated user — forms read category/type lists from here. */
  @Get()
  async get() {
    const org = await this.prisma.organization.findFirst();
    return {
      organization: org
        ? { id: org.id, name: org.name, address: org.address, gstin: org.gstin, pan: org.pan, logoKey: org.logoKey }
        : null,
      settings: (org?.settings as unknown) ?? DEFAULT_SETTINGS,
    };
  }

  @Put()
  @UseGuards(PermissionsGuard)
  @RequirePermission('settings:manage')
  async update(
    @CurrentUser() actor: AuthUser,
    @Body() body: { organization?: Record<string, unknown>; settings?: Record<string, unknown> },
  ) {
    const org = await this.prisma.organization.findFirst();
    if (!org) return { ok: false };

    const updated = await this.prisma.organization.update({
      where: { id: org.id },
      data: {
        ...(body.organization
          ? {
              name: (body.organization.name as string) ?? org.name,
              address: (body.organization.address as string) ?? org.address,
              gstin: (body.organization.gstin as string) ?? org.gstin,
              pan: (body.organization.pan as string) ?? org.pan,
            }
          : {}),
        ...(body.settings ? { settings: body.settings as Prisma.InputJsonValue } : {}),
      },
    });
    await this.audit.log({
      actorId: actor.id,
      action: 'UPDATE',
      entity: 'Organization',
      entityId: org.id,
    });
    return { ok: true, organization: { id: updated.id, name: updated.name } };
  }
}
