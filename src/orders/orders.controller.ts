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
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from './entities/order.entity';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../auth/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles(UserRole.USER)
  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
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
