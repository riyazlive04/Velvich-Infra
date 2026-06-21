import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('audit')
@UseGuards(PermissionsGuard)
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermission('audit:view')
  async list(
    @Query('entity') entity?: string,
    @Query('actorId') actorId?: string,
    @Query('take') take = '100',
  ) {
    const entries = await this.prisma.auditEntry.findMany({
      where: {
        ...(entity ? { entity } : {}),
        ...(actorId ? { actorId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(take) || 100, 500),
    });
    return { entries };
  }
}
