import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleName, isCapability } from '@velvich/shared';
import { getAuth } from '../auth/auth.config';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../auth/auth-user';

export interface PermissionChange {
  permission: string;
  effect: 'ALLOW' | 'DENY' | null; // null clears the override (back to inherited)
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Create a user with a temporary password. TODO: email invite via Resend. */
  async invite(input: { name: string; email: string; phone?: string; role: RoleName }) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictException('A user with this email already exists');

    const tempPassword = this.generateTempPassword();
    const signUp = await (await getAuth()).api.signUpEmail({
      body: { email: input.email, password: tempPassword, name: input.name },
    });
    if (!signUp?.user) throw new BadRequestException('Failed to create user');

    const user = await this.prisma.user.update({
      where: { id: signUp.user.id },
      data: { role: input.role, phone: input.phone ?? null, status: 'ACTIVE' },
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    // Returned ONCE so the Owner can share it; production should email a reset link.
    return { user, tempPassword };
  }

  async setStatus(actor: AuthUser, userId: string, status: 'ACTIVE' | 'INACTIVE') {
    const target = await this.requireUser(userId);
    if (status === 'INACTIVE') await this.assertNotLastOwner(target.id, target.role);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status },
      select: { id: true, status: true },
    });
    await this.audit.log({
      actorId: actor.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: userId,
      before: { status: target.status },
      after: { status },
    });
    return updated;
  }

  async setRole(actor: AuthUser, userId: string, role: RoleName) {
    const target = await this.requireUser(userId);
    if (target.role === 'OWNER' && role !== 'OWNER') {
      await this.assertNotLastOwner(target.id, target.role);
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, role: true },
    });
    await this.audit.log({
      actorId: actor.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: userId,
      before: { role: target.role },
      after: { role },
    });
    return updated;
  }

  async getPermissions(userId: string) {
    const user = await this.requireUser(userId);
    const matrix = await this.permissions.getMatrix(user.id, user.role);
    return { userId: user.id, role: user.role, matrix };
  }

  /**
   * Apply permission-matrix changes. Guards:
   *  - cannot edit your OWN permissions:manage away (no self-lockout)
   *  - OWNER's permissions are immutable (always full set)
   * Each change writes/clears a UserPermissionOverride row + an audit entry.
   */
  async updatePermissions(actor: AuthUser, userId: string, changes: PermissionChange[]) {
    const target = await this.requireUser(userId);
    if (target.role === 'OWNER') {
      throw new ForbiddenException('Owner permissions cannot be overridden');
    }

    for (const change of changes) {
      if (!isCapability(change.permission)) {
        throw new BadRequestException(`Unknown capability: ${change.permission}`);
      }
      if (
        actor.id === userId &&
        change.permission === 'permissions:manage' &&
        change.effect !== 'ALLOW'
      ) {
        throw new ForbiddenException('You cannot remove your own permissions:manage');
      }
    }

    const before = await this.permissions.getMatrix(target.id, target.role);

    await this.prisma.$transaction(
      changes.map((change) => {
        if (change.effect === null) {
          return this.prisma.userPermissionOverride.deleteMany({
            where: { userId, permission: change.permission },
          });
        }
        return this.prisma.userPermissionOverride.upsert({
          where: { userId_permission: { userId, permission: change.permission } },
          create: { userId, permission: change.permission, effect: change.effect },
          update: { effect: change.effect },
        });
      }),
    );

    const after = await this.permissions.getMatrix(target.id, target.role);
    await this.audit.log({
      actorId: actor.id,
      action: 'PERMISSION_CHANGE',
      entity: 'User',
      entityId: userId,
      before,
      after,
    });

    return { userId, matrix: after };
  }

  private async requireUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /** Prevent removing the last active OWNER. */
  private async assertNotLastOwner(userId: string, role: RoleName) {
    if (role !== 'OWNER') return;
    const activeOwners = await this.prisma.user.count({
      where: { role: 'OWNER', status: 'ACTIVE', NOT: { id: userId } },
    });
    if (activeOwners === 0) {
      throw new ForbiddenException('At least one active Owner must remain');
    }
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let out = '';
    const bytes = new Uint8Array(14);
    // crypto is available globally in Node 20.
    crypto.getRandomValues(bytes);
    for (const b of bytes) out += chars[b % chars.length];
    return `${out}!9`;
  }
}
