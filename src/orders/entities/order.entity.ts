import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { User } from '../../users/entities/user.entity';
import type { OrderItem } from './order-item.entity';

export enum OrderStatus {
  CREATED = 'CREATED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

@Entity('orders')
@Index('IDX_orders_user_id', ['userId'])
@Index('IDX_orders_created_at', ['createdAt'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;
  @ManyToOne('User', (user: User) => user.orders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany('OrderItem', (item: OrderItem) => item.order)
  items: OrderItem[];

  @Column({
    type: 'enum',
    enum: OrderStatus,
    enumName: 'orders_status_enum',
    default: OrderStatus.CREATED,
  })
  status: OrderStatus;

  @Column({
    type: 'varchar',
    length: 120,
    name: 'idempotency_key',
    unique: true,
  })
  idempotencyKey: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
