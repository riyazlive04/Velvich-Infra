import { Injectable, NotFoundException } from '@nestjs/common';
import { collectionPercent, istMonthKey, istMonthRange } from '@velvich/shared';
import { PrismaService } from '../prisma/prisma.service';

export interface ProjectAccount {
  projectId: string;
  name: string;
  stage: string;
  contractAmount: number | null; // paise
  incomeReceived: number; // paise
  incomePending: number; // paise
  expenseSpent: number; // paise
  net: number; // paise (received - spent)
  collectionPercent: number | null;
}

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Per-project P&L - every figure derived from transactions. */
  async projectAccount(projectId: string): Promise<ProjectAccount> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, stage: true, contractAmount: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    return this.computeForProject(project);
  }

  async allProjectAccounts(): Promise<ProjectAccount[]> {
    const projects = await this.prisma.project.findMany({
      select: { id: true, name: true, stage: true, contractAmount: true },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(projects.map((p) => this.computeForProject(p)));
  }

  private async computeForProject(project: {
    id: string;
    name: string;
    stage: string;
    contractAmount: bigint | null;
  }): Promise<ProjectAccount> {
    const txns = await this.prisma.transaction.findMany({
      where: { projectId: project.id },
      select: { type: true, amount: true, incomeStatus: true },
    });

    let incomeReceived = 0;
    let incomePending = 0;
    let expenseSpent = 0;
    for (const t of txns) {
      const amt = Number(t.amount);
      if (t.type === 'INCOME') {
        if (t.incomeStatus === 'PENDING') incomePending += amt;
        else incomeReceived += amt;
      } else {
        expenseSpent += amt;
      }
    }

    const contract = project.contractAmount === null ? null : Number(project.contractAmount);
    return {
      projectId: project.id,
      name: project.name,
      stage: project.stage,
      contractAmount: contract,
      incomeReceived,
      incomePending,
      expenseSpent,
      net: incomeReceived - expenseSpent,
      collectionPercent: collectionPercent(incomeReceived, contract),
    };
  }

  /**
   * Monthly ledger (passbook): opening balance carried from all prior months,
   * this month's credits/debits, and closing. Closing of month N equals the
   * opening of N+1 by construction.
   */
  async ledger(monthKey?: string) {
    const key = monthKey ?? istMonthKey(new Date());
    const { start, end } = istMonthRange(key);

    const prior = await this.prisma.transaction.findMany({
      where: { date: { lt: start } },
      select: { type: true, amount: true },
    });
    const opening = prior.reduce(
      (acc, t) => acc + (t.type === 'INCOME' ? Number(t.amount) : -Number(t.amount)),
      0,
    );

    const monthTxns = await this.prisma.transaction.findMany({
      where: { date: { gte: start, lt: end } },
      select: {
        id: true,
        type: true,
        amount: true,
        date: true,
        category: true,
        description: true,
        projectId: true,
      },
      orderBy: { date: 'asc' },
    });

    let credits = 0;
    let debits = 0;
    let running = opening;
    const statement = monthTxns.map((t) => {
      const amt = Number(t.amount);
      if (t.type === 'INCOME') {
        credits += amt;
        running += amt;
      } else {
        debits += amt;
        running -= amt;
      }
      return {
        id: t.id,
        date: t.date,
        type: t.type,
        category: t.category,
        description: t.description,
        amount: amt,
        balance: running,
      };
    });

    return {
      month: key,
      opening,
      credits,
      debits,
      closing: opening + credits - debits,
      statement,
    };
  }
}
