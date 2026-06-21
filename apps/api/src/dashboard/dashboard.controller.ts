import { Controller, Get, UseGuards } from '@nestjs/common';
import { agingBucket, daysOverdue } from '@velvich/shared';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { PrismaService } from '../prisma/prisma.service';

const ACTIVE_STAGES = ['SURVEY', 'DPR_PREPARATION', 'SUBMITTED', 'APPROVED', 'WORK_ORDER', 'EXECUTION'];

@Controller('dashboard')
@UseGuards(PermissionsGuard)
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermission('dashboard:view')
  async summary() {
    const now = new Date();
    const [activeProjects, txns, receivables, recent, upcomingMilestones] = await Promise.all([
      this.prisma.project.count({ where: { stage: { in: ACTIVE_STAGES as never } } }),
      this.prisma.transaction.findMany({ select: { type: true, amount: true, incomeStatus: true } }),
      this.prisma.receivable.findMany({
        where: { status: 'PENDING' },
        include: { project: { select: { name: true } } },
      }),
      this.prisma.transaction.findMany({
        include: { project: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.milestone.findMany({
        where: { dueDate: { gte: now } },
        include: { project: { select: { name: true } } },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
    ]);

    let incomeReceived = 0;
    let expense = 0;
    for (const t of txns) {
      const amt = Number(t.amount);
      if (t.type === 'INCOME' && t.incomeStatus !== 'PENDING') incomeReceived += amt;
      if (t.type === 'EXPENSE') expense += amt;
    }

    const overdue = receivables
      .map((r) => {
        const days = r.dueDate ? daysOverdue(r.dueDate, now) : 0;
        return {
          id: r.id,
          project: r.project.name,
          amount: Number(r.expectedAmount),
          daysOverdue: days,
          bucket: agingBucket(days),
        };
      })
      .filter((r) => r.daysOverdue > 0)
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    return {
      metrics: {
        activeProjects,
        incomeReceived,
        expense,
        net: incomeReceived - expense,
        overdueCount: overdue.length,
        overdueAmount: overdue.reduce((s, r) => s + r.amount, 0),
      },
      recentTransactions: recent.map((t) => ({
        id: t.id,
        type: t.type,
        category: t.category,
        amount: Number(t.amount),
        date: t.date,
        project: t.project?.name ?? null,
      })),
      overdue: overdue.slice(0, 5),
      upcomingMilestones: upcomingMilestones.map((m) => ({
        id: m.id,
        label: m.label,
        project: m.project.name,
        dueDate: m.dueDate,
        expectedAmount: m.expectedAmount === null ? null : Number(m.expectedAmount),
      })),
    };
  }
}
