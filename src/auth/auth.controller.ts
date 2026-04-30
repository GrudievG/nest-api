import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import type { Request } from 'express';
import type { AuthUser } from './types';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { RequestWithId } from '../common/middleware/request-id.middleware';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(
    @Body() loginDto: LoginDto,
    @Req() req: Request & Partial<RequestWithId>,
  ) {
    return this.authService.login(loginDto.email, loginDto.password, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      correlationId: req.requestId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: Request & { user?: AuthUser }): AuthUser {
    return req.user as AuthUser;
  }
}
