import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'PERMISSION_CHANGE'
  | 'LOGIN'
  | 'DOWNLOAD';

export interface AuditInput {
  actorId: string;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Record a change. Money BigInts are normalised so audit JSON stays valid. */
  async log(input: AuditInput): Promise<void> {
    await this.prisma.auditEntry.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        before: this.normalise(input.before),
        after: this.normalise(input.after),
      },
    });
  }

  private normalise(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (value === undefined || value === null) return Prisma.JsonNull;
    return JSON.parse(
      JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? Number(v) : v)),
    ) as Prisma.InputJsonValue;
  }
}
