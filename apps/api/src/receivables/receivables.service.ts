import { Injectable, NotFoundException } from '@nestjs/common';
import { agingBucket, daysOverdue, type ReceivableInput } from '@velvich/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../auth/auth-user';

@Injectable()
export class ReceivablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Outstanding receivables across projects, aged by due date (oldest first). */
  async list() {
    const now = new Date();
    const items = await this.prisma.receivable.findMany({
      where: { status: 'PENDING' },
      include: {
        project: { select: { id: true, name: true } },
        followUps: { orderBy: { contactedAt: 'desc' }, take: 1 },
      },
      orderBy: { dueDate: 'asc' },
    });
    return items.map((r) => {
      const days = r.dueDate ? daysOverdue(r.dueDate, now) : 0;
      return {
        id: r.id,
        project: r.project,
        expectedAmount: Number(r.expectedAmount),
        dueDate: r.dueDate,
        daysOverdue: days,
        bucket: agingBucket(days),
        overdue: days > 0,
        lastFollowUp: r.followUps[0] ?? null,
      };
    });
  }

  async create(actor: AuthUser, input: ReceivableInput) {
    const r = await this.prisma.receivable.create({
      data: {
        projectId: input.projectId,
        expectedAmount: BigInt(input.expectedAmount),
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      },
    });
    await this.audit.log({ actorId: actor.id, action: 'CREATE', entity: 'Receivable', entityId: r.id });
    return { ...r, expectedAmount: Number(r.expectedAmount) };
  }

  async addFollowUp(actor: AuthUser, receivableId: string, outcome?: string) {
    await this.requireReceivable(receivableId);
    return this.prisma.followUp.create({
      data: { receivableId, byUser: actor.id, outcome: outcome ?? null },
    });
  }

  async markReceived(actor: AuthUser, id: string) {
    await this.requireReceivable(id);
    const r = await this.prisma.receivable.update({ where: { id }, data: { status: 'RECEIVED' } });
    await this.audit.log({
      actorId: actor.id,
      action: 'UPDATE',
      entity: 'Receivable',
      entityId: id,
      after: { status: 'RECEIVED' },
    });
    return { ...r, expectedAmount: Number(r.expectedAmount) };
  }

  private async requireReceivable(id: string) {
    const r = await this.prisma.receivable.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Receivable not found');
    return r;
  }
}
