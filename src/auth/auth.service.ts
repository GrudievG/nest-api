import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { JwtPayload } from './types';
import { AuditService } from '../common/audit/audit.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly auditService: AuditService,
  ) {}

  async login(
    email: string,
    password: string,
    meta?: { ip?: string; userAgent?: string; correlationId?: string },
  ): Promise<{ accessToken: string }> {
    const correlationId = meta?.correlationId ?? 'unknown';

    const user = await this.usersRepository
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email })
      .getOne();

    if (!user?.passwordHash) {
      this.auditService.emit({
        action: 'auth.login.failure',
        actorId: null,
        actorRoles: [],
        targetType: 'User',
        targetId: null,
        outcome: 'failure',
        correlationId,
        ip: meta?.ip,
        userAgent: meta?.userAgent,
        reason: 'user_not_found',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      this.auditService.emit({
        action: 'auth.login.failure',
        actorId: user.id,
        actorRoles: user.roles,
        targetType: 'User',
        targetId: user.id,
        outcome: 'failure',
        correlationId,
        ip: meta?.ip,
        userAgent: meta?.userAgent,
        reason: 'invalid_password',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    this.auditService.emit({
      action: 'auth.login.success',
      actorId: user.id,
      actorRoles: user.roles,
      targetType: 'User',
      targetId: user.id,
      outcome: 'success',
      correlationId,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      scopes: user.scopes,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken };
  }
}
