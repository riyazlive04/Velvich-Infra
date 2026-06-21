import { Injectable, NotFoundException } from '@nestjs/common';
import type { ActivityInput } from '@velvich/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../auth/auth-user';

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(projectId?: string) {
    return this.prisma.activity.findMany({
      where: projectId ? { projectId } : undefined,
      include: {
        project: { select: { id: true, name: true } },
        staff: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      take: 200,
    });
  }

  async create(actor: AuthUser, input: ActivityInput) {
    const activity = await this.prisma.activity.create({
      data: {
        type: input.type,
        date: new Date(input.date),
        notes: input.notes ?? null,
        projectId: input.projectId ?? null,
        staffId: input.staffId ?? null,
        photoKey: input.photoKey ?? null,
        createdBy: actor.id,
      },
    });
    await this.audit.log({
      actorId: actor.id,
      action: 'CREATE',
      entity: 'Activity',
      entityId: activity.id,
      after: { type: activity.type },
    });
    return activity;
  }

  async remove(actor: AuthUser, id: string) {
    const activity = await this.prisma.activity.findUnique({ where: { id } });
    if (!activity) throw new NotFoundException('Activity not found');
    await this.prisma.activity.delete({ where: { id } });
    await this.audit.log({ actorId: actor.id, action: 'DELETE', entity: 'Activity', entityId: id });
    return { ok: true };
  }
}
