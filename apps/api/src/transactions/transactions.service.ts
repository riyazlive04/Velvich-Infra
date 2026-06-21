import { Injectable, NotFoundException } from '@nestjs/common';
import {
  istMonthRange,
  type AiContext,
  type OrgSettings,
  type TransactionInput,
  type TxnSource,
} from '@velvich/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../auth/auth-user';

export interface TxnFilters {
  type?: 'INCOME' | 'EXPENSE';
  projectId?: string;
  month?: string; // YYYY-MM (IST)
}

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(filters: TxnFilters) {
    const where: Record<string, unknown> = {};
    if (filters.type) where.type = filters.type;
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.month) {
      const { start, end } = istMonthRange(filters.month);
      where.date = { gte: start, lt: end };
    }

    const txns = await this.prisma.transaction.findMany({
      where,
      include: { project: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    });

    // Totals include pending income separately so the UI can show both.
    let incomeReceived = 0;
    let incomePending = 0;
    let expense = 0;
    for (const t of txns) {
      const amt = Number(t.amount);
      if (t.type === 'INCOME') {
        if (t.incomeStatus === 'PENDING') incomePending += amt;
        else incomeReceived += amt;
      } else {
        expense += amt;
      }
    }

    return {
      transactions: txns.map((t) => ({ ...t, amount: Number(t.amount) })),
      totals: { incomeReceived, incomePending, expense, net: incomeReceived - expense },
    };
  }

  async create(actor: AuthUser, input: TransactionInput, source: TxnSource = 'manual') {
    const txn = await this.prisma.transaction.create({
      data: {
        type: input.type,
        category: input.category,
        description: input.description ?? null,
        amount: BigInt(input.amount),
        date: new Date(input.date),
        projectId: input.projectId ?? null,
        incomeStatus: input.type === 'INCOME' ? (input.incomeStatus ?? 'RECEIVED') : null,
        paidVia: input.type === 'EXPENSE' ? (input.paidVia ?? null) : null,
        reference: input.reference ?? null,
        taxableValue: input.taxableValue != null ? BigInt(input.taxableValue) : null,
        gstPercent: input.gstPercent ?? null,
        tdsAmount: input.tdsAmount != null ? BigInt(input.tdsAmount) : null,
        receiptKey: input.receiptKey ?? null,
        source,
        createdBy: actor.id,
      },
    });
    await this.audit.log({
      actorId: actor.id,
      action: 'CREATE',
      entity: 'Transaction',
      entityId: txn.id,
      after: { type: txn.type, amount: Number(txn.amount), category: txn.category, source },
    });
    return { ...txn, amount: Number(txn.amount) };
  }

  async update(actor: AuthUser, id: string, input: TransactionInput) {
    const before = await this.requireTxn(id);
    const txn = await this.prisma.transaction.update({
      where: { id },
      data: {
        type: input.type,
        category: input.category,
        description: input.description ?? null,
        amount: BigInt(input.amount),
        date: new Date(input.date),
        projectId: input.projectId ?? null,
        incomeStatus: input.type === 'INCOME' ? (input.incomeStatus ?? 'RECEIVED') : null,
        paidVia: input.type === 'EXPENSE' ? (input.paidVia ?? null) : null,
        reference: input.reference ?? null,
        taxableValue: input.taxableValue != null ? BigInt(input.taxableValue) : null,
        gstPercent: input.gstPercent ?? null,
        tdsAmount: input.tdsAmount != null ? BigInt(input.tdsAmount) : null,
      },
    });
    await this.audit.log({
      actorId: actor.id,
      action: 'UPDATE',
      entity: 'Transaction',
      entityId: id,
      before: { amount: Number(before.amount), category: before.category },
      after: { amount: Number(txn.amount), category: txn.category },
    });
    return { ...txn, amount: Number(txn.amount) };
  }

  async remove(actor: AuthUser, id: string) {
    const before = await this.requireTxn(id);
    await this.prisma.transaction.delete({ where: { id } });
    await this.audit.log({
      actorId: actor.id,
      action: 'DELETE',
      entity: 'Transaction',
      entityId: id,
      before: { amount: Number(before.amount), category: before.category },
    });
    return { ok: true };
  }

  /** Minimal, least-privilege context for the AI assist (no other users' data). */
  async buildAiContext(): Promise<AiContext> {
    const org = await this.prisma.organization.findFirst({ select: { settings: true } });
    const settings = (org?.settings ?? {}) as Partial<OrgSettings>;
    const projects = await this.prisma.project.findMany({
      select: { id: true, name: true },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
    return {
      today: this.todayIso(),
      projects,
      incomeCategories: settings.incomeCategories ?? [],
      expenseCategories: settings.expenseCategories ?? [],
    };
  }

  private todayIso(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  }

  private async requireTxn(id: string) {
    const txn = await this.prisma.transaction.findUnique({ where: { id } });
    if (!txn) throw new NotFoundException('Transaction not found');
    return txn;
  }
}
