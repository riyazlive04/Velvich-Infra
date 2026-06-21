import type { Capability, RoleName, OrgSettings } from '@velvich/shared';

export interface MeResponse {
  user: { id: string; name: string; email: string; role: RoleName };
  permissions: Capability[];
  organization: {
    id: string;
    name: string;
    settings: OrgSettings;
    logoKey: string | null;
  } | null;
}
