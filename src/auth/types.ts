import { UserRole } from '../users/entities/user.entity';

export type JwtPayload = {
  sub: string;
  email: string;
  roles: UserRole[];
  scopes: string[];
};

export type AuthUser = {
  sub: string;
  email: string;
  roles: UserRole[];
  scopes: string[];
};
