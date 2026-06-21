import { Injectable, NotFoundException } from '@nestjs/common';
import type { StaffInput } from '@velvich/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../auth/auth-user';

/** Active stages count toward a staff member's "load" for over-allocation flags. */
const ACTIVE_STAGES = ['SURVEY', 'DPR_PREPARATION', 'WORK_ORDER', 'EXECUTION'] as const;
const OVER_ALLOCATION_THRESHOLD = 3;

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    const staff = await this.prisma.staff.findMany({
      include: {
        assignments: { include: { project: { select: { id: true, name: true, stage: true } } } },
      },
      orderBy: { name: 'asc' },
    });
    return staff.map((s) => {
      const total = s.assignments.length;
      const active = s.assignments.filter((a) =>
        (ACTIVE_STAGES as readonly string[]).includes(a.project.stage),
      ).length;
      return {
        id: s.id,
        name: s.name,
        role: s.role,
        phone: s.phone,
        skills: s.skills,
        totalProjects: total,
        activeProjects: active,
        overAllocated: active > OVER_ALLOCATION_THRESHOLD,
        projects: s.assignments.map((a) => a.project),
      };
    });
  }

  async create(actor: AuthUser, input: StaffInput) {
    const staff = await this.prisma.staff.create({ data: input });
    await this.audit.log({
      actorId: actor.id,
      action: 'CREATE',
      entity: 'Staff',
      entityId: staff.id,
      after: { name: staff.name, role: staff.role },
    });
    return staff;
  }

  async update(actor: AuthUser, id: string, input: StaffInput) {
    await this.requireStaff(id);
    const staff = await this.prisma.staff.update({ where: { id }, data: input });
    await this.audit.log({ actorId: actor.id, action: 'UPDATE', entity: 'Staff', entityId: id });
    return staff;
  }

  async remove(actor: AuthUser, id: string) {
    await this.requireStaff(id);
    await this.prisma.staff.delete({ where: { id } });
    await this.audit.log({ actorId: actor.id, action: 'DELETE', entity: 'Staff', entityId: id });
    return { ok: true };
  }

  private async requireStaff(id: string) {
    const staff = await this.prisma.staff.findUnique({ where: { id } });
    if (!staff) throw new NotFoundException('Staff not found');
    return staff;
  }
}
