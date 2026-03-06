import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser, JwtPayload } from './types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('auth.secret'),
    });
  }

  validate(payload: JwtPayload): AuthUser {
    return {
      sub: payload.sub,
      email: payload.email,
      roles: payload.roles,
      scopes: payload.scopes,
    };
  }
}
