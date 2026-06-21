import type { RoleName } from '@velvich/shared';

/** The authenticated principal attached to each request by AuthGuard. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: RoleName;
  status: 'ACTIVE' | 'INACTIVE';
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      sessionId?: string;
    }
  }
}
