import { Injectable } from '@nestjs/common';
import {
  ALL_CAPABILITIES,
  Capability,
  getEffectivePermissions,
  getMatrixState,
  MatrixState,
  RoleName,
} from '@velvich/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Effective capability set for a user (role preset ∪ ALLOW − DENY; OWNER = all). */
  async getEffective(userId: string, role: RoleName): Promise<Set<Capability>> {
    if (role === 'OWNER') return getEffectivePermissions({ role: 'OWNER', overrides: [] });
    const overrides = await this.prisma.userPermissionOverride.findMany({
      where: { userId },
      select: { permission: true, effect: true },
    });
    return getEffectivePermissions({ role, overrides });
  }

  /** Tri-state matrix for the Owner UI: per-capability inherited/allow/deny. */
  async getMatrix(
    userId: string,
    role: RoleName,
  ): Promise<Record<string, MatrixState>> {
    const overrides = await this.prisma.userPermissionOverride.findMany({
      where: { userId },
      select: { permission: true, effect: true },
    });
    const subject = { role, overrides };
    const result: Record<string, MatrixState> = {};
    for (const cap of ALL_CAPABILITIES) {
      result[cap] = getMatrixState(subject, cap);
    }
    return result;
  }
}
