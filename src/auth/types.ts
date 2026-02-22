import { UserRole } from '../users/entities/user.entity';

export type JwtPayload = {
  sub: string;
  email: string;
  roles: UserRole[];
};

export type AuthUser = {
  userId: string;
  email: string;
  roles: UserRole[];
};
