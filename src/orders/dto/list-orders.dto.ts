import { OrderStatus } from '../entities/order.entity';

export class ListOrdersDto {
  userId?: string;
  status?: OrderStatus;
  from?: Date;
  to?: Date;
  limit: number;
  offset: number;
};
