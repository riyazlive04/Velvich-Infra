import { Injectable, NotFoundException } from '@nestjs/common';
import { PROJECT_STAGES, type ProjectInput, type StageChangeInput } from '@velvich/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AccountsService } from '../accounts/accounts.service';
import type { AuthUser } from '../auth/auth-user';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly accounts: AccountsService,
  ) {}

  async list(filters: { stage?: string; clientId?: string; search?: string }) {
    return this.prisma.project.findMany({
      where: {
        ...(filters.stage ? { stage: filters.stage as ProjectInput['stage'] } : {}),
        ...(filters.clientId ? { clientId: filters.clientId } : {}),
        ...(filters.search ? { name: { contains: filters.search, mode: 'insensitive' } } : {}),
      },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Kanban: projects grouped by stage, each with computed collection %. */
  async board() {
    const accounts = await this.accounts.allProjectAccounts();
    const byId = new Map(accounts.map((a) => [a.projectId, a]));
    const projects = await this.prisma.project.findMany({
      include: { client: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    const columns = PROJECT_STAGES.map((stage) => ({
      stage,
      projects: projects
        .filter((p) => p.stage === stage)
        .map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          clientName: p.client?.name ?? null,
          contractAmount: p.contractAmount === null ? null : Number(p.contractAmount),
          collectionPercent: byId.get(p.id)?.collectionPercent ?? null,
        })),
    }));
    return { columns };
  }

  async get(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        milestones: true,
        staff: { include: { staff: true } },
        stageHistory: { orderBy: { changedAt: 'desc' } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    const account = await this.accounts.projectAccount(id);
    return { ...project, account };
  }

  async create(actor: AuthUser, input: ProjectInput) {
    const project = await this.prisma.project.create({
      data: {
        name: input.name,
        type: input.type,
        deptType: input.deptType ?? null,
        district: input.district ?? null,
        clientId: input.clientId ?? null,
        contractAmount: input.contractAmount != null ? BigInt(input.contractAmount) : null,
        stage: input.stage,
        startDate: input.startDate ? new Date(input.startDate) : null,
        workOrderNo: input.workOrderNo ?? null,
        sanctionRef: input.sanctionRef ?? null,
        expectedCompletion: input.expectedCompletion ? new Date(input.expectedCompletion) : null,
        notes: input.notes ?? null,
        milestones: {
          create: input.milestones.map((m) => ({
            label: m.label,
            expectedAmount: m.expectedAmount != null ? BigInt(m.expectedAmount) : null,
            dueDate: m.dueDate ? new Date(m.dueDate) : null,
          })),
        },
        staff: { create: input.staffIds.map((staffId) => ({ staffId })) },
        stageHistory: { create: { stage: input.stage, changedBy: actor.id, note: 'Created' } },
      },
    });
    await this.audit.log({
      actorId: actor.id,
      action: 'CREATE',
      entity: 'Project',
      entityId: project.id,
      after: { name: project.name, type: project.type },
    });
    return project;
  }

  async update(actor: AuthUser, id: string, input: ProjectInput) {
    await this.requireProject(id);
    const project = await this.prisma.$transaction(async (tx) => {
      await tx.milestone.deleteMany({ where: { projectId: id } });
      await tx.projectStaff.deleteMany({ where: { projectId: id } });
      return tx.project.update({
        where: { id },
        data: {
          name: input.name,
          type: input.type,
          deptType: input.deptType ?? null,
          district: input.district ?? null,
          clientId: input.clientId ?? null,
          contractAmount: input.contractAmount != null ? BigInt(input.contractAmount) : null,
          startDate: input.startDate ? new Date(input.startDate) : null,
          workOrderNo: input.workOrderNo ?? null,
          sanctionRef: input.sanctionRef ?? null,
          expectedCompletion: input.expectedCompletion ? new Date(input.expectedCompletion) : null,
          notes: input.notes ?? null,
          milestones: {
            create: input.milestones.map((m) => ({
              label: m.label,
              expectedAmount: m.expectedAmount != null ? BigInt(m.expectedAmount) : null,
              dueDate: m.dueDate ? new Date(m.dueDate) : null,
            })),
          },
          staff: { create: input.staffIds.map((staffId) => ({ staffId })) },
        },
      });
    });
    await this.audit.log({ actorId: actor.id, action: 'UPDATE', entity: 'Project', entityId: id });
    return project;
  }

  /** Move a project to a new stage — always records StageHistory. */
  async changeStage(actor: AuthUser, id: string, input: StageChangeInput) {
    const project = await this.requireProject(id);
    if (project.stage === input.stage && !input.note) return project;

    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        stage: input.stage,
        stageHistory: { create: { stage: input.stage, changedBy: actor.id, note: input.note } },
      },
    });
    await this.audit.log({
      actorId: actor.id,
      action: 'UPDATE',
      entity: 'Project',
      entityId: id,
      before: { stage: project.stage },
      after: { stage: input.stage },
    });
    return updated;
  }

  async remove(actor: AuthUser, id: string) {
    await this.requireProject(id);
    await this.prisma.project.delete({ where: { id } });
    await this.audit.log({ actorId: actor.id, action: 'DELETE', entity: 'Project', entityId: id });
    return { ok: true };
  }

  private async requireProject(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }
}
