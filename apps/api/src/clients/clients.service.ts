import { Injectable, NotFoundException } from '@nestjs/common';
import type { ClientInput } from '@velvich/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../auth/auth-user';

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(search?: string) {
    const clients = await this.prisma.client.findMany({
      where: search
        ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { city: { contains: search, mode: 'insensitive' } }] }
        : undefined,
      include: { contacts: true, _count: { select: { projects: true } } },
      orderBy: { name: 'asc' },
    });
    return clients.map((c) => ({ ...c, projectCount: c._count.projects }));
  }

  async get(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: { contacts: true, projects: { select: { id: true, name: true, stage: true } } },
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async create(actor: AuthUser, input: ClientInput) {
    const client = await this.prisma.client.create({
      data: {
        name: input.name,
        deptType: input.deptType,
        city: input.city ?? null,
        contacts: { create: input.contacts.map((c) => ({ ...c, email: c.email || null })) },
      },
      include: { contacts: true },
    });
    await this.audit.log({
      actorId: actor.id,
      action: 'CREATE',
      entity: 'Client',
      entityId: client.id,
      after: { name: client.name, deptType: client.deptType },
    });
    return client;
  }

  async update(actor: AuthUser, id: string, input: ClientInput) {
    const before = await this.get(id);
    // Replace contacts wholesale (simple + predictable for a small contact list).
    const client = await this.prisma.$transaction(async (tx) => {
      await tx.clientContact.deleteMany({ where: { clientId: id } });
      return tx.client.update({
        where: { id },
        data: {
          name: input.name,
          deptType: input.deptType,
          city: input.city ?? null,
          contacts: { create: input.contacts.map((c) => ({ ...c, email: c.email || null })) },
        },
        include: { contacts: true },
      });
    });
    await this.audit.log({
      actorId: actor.id,
      action: 'UPDATE',
      entity: 'Client',
      entityId: id,
      before: { name: before.name },
      after: { name: client.name },
    });
    return client;
  }

  async remove(actor: AuthUser, id: string) {
    const client = await this.get(id);
    if (client.projects.length > 0) {
      // Keep referential history - block deletion of clients with projects.
      throw new NotFoundException('Cannot delete a client that has projects');
    }
    await this.prisma.client.delete({ where: { id } });
    await this.audit.log({
      actorId: actor.id,
      action: 'DELETE',
      entity: 'Client',
      entityId: id,
      before: { name: client.name },
    });
    return { ok: true };
  }
}
