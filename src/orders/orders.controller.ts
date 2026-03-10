import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from './entities/order.entity';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../auth/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ScopesGuard } from '../auth/scopes.guard';
import { Scopes } from '../auth/scopes.decorator';
import { AuthUser } from '../auth/types';

@UseGuards(JwtAuthGuard, RolesGuard, ScopesGuard)
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles(UserRole.USER, UserRole.ADMIN)
  @Scopes('orders:write')
  @Post()
  create(
    @Req() req: Request & { user?: AuthUser },
    @Body() createOrderDto: CreateOrderDto,
  ) {
    const items = createOrderDto?.items ?? [];

    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('items must be a non-empty array');
    }

    for (const it of items) {
      if (!it?.productId || typeof it.productId !== 'string') {
        throw new BadRequestException('items[].productId is required');
      }
      if (!Number.isInteger(it.quantity) || it.quantity <= 0) {
        throw new BadRequestException(
          'items[].quantity must be a positive integer',
        );
      }
    }

    const userId = (req.user as AuthUser).sub;

    return this.ordersService.create(userId, createOrderDto);
  }

  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.SUPPORT)
  @Get()
  getList(
    @Query('userId') userId?: string,
    @Query('status') status?: OrderStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = Number(limit ?? 20);
    const parsedOffset = Number(offset ?? 0);
    const safeLimit =
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;
    const safeOffset =
      Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    if (fromDate && Number.isNaN(fromDate.getTime())) {
      throw new BadRequestException('from must be valid date');
    }

    if (toDate && Number.isNaN(toDate.getTime())) {
      throw new BadRequestException('to must be valid date');
    }

    return this.ordersService.getList({
      userId,
      status,
      from: fromDate,
      to: toDate,
      limit: safeLimit,
      offset: safeOffset,
    });
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const deleted = await this.ordersService.delete(id);

    if (!deleted) {
      throw new NotFoundException('Order not found');
    }

    return { ok: true };
  }
}
