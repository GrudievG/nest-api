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
import type { Order } from '../../orders/entities/order.entity';
import { FileRecord } from '../../files/file-record.entity';

export enum UserRole {
  USER = 'user',
  SUPPORT = 'support',
  ADMIN = 'admin',
}

@Entity('users')
@Index('IDX_users_email_unique', ['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 320 })
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'password_hash',
    select: false,
  })
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role_enum',
    array: true,
    default: () => `ARRAY['user']::user_role_enum[]`,
  })
  roles: UserRole[];

  @Column({
    type: 'text',
    array: true,
    default: () => `'ARRAY[]::text[]'`,
  })
  scopes: string[];

  @Column({ type: 'uuid', name: 'avatar_file_id', nullable: true })
  avatarFileId: string | null;

  @ManyToOne(() => FileRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'avatar_file_id' })
  avatarFile: FileRecord | null;

  @OneToMany('Order', (order: Order) => order.user)
  orders: Order[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
