import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindAllQueryDto } from './dto/find-all-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from './entities/user.entity';
import { AuthUser } from '../auth/types';
import { AttachFileDto } from '../files/dto/attach-file.dto';
import { AuditService } from '../common/audit/audit.service';
import type { RequestWithId } from '../common/middleware/request-id.middleware';
import type { Request } from 'express';

@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post()
  register(@Body() registerUserDto: RegisterUserDto) {
    return this.usersService.create(registerUserDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  findAll(@Query() query: FindAllQueryDto) {
    const { offset, limit } = query;
    return this.usersService.findAll(offset, limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/avatar')
  setMyAvatar(
    @Req() req: Request & { user?: AuthUser },
    @Body() body: AttachFileDto,
  ) {
    return this.usersService.setAvatar((req.user as AuthUser).sub, body.fileId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user?: AuthUser } & Partial<RequestWithId>,
  ) {
    const actor = req.user as AuthUser;
    await this.usersService.remove(id);

    this.auditService.emit({
      action: 'user.admin.delete',
      actorId: actor.sub,
      actorRoles: actor.roles,
      targetType: 'User',
      targetId: id,
      outcome: 'success',
      correlationId: req.requestId ?? 'unknown',
      ip: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }
}
