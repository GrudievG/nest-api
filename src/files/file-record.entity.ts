import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/entities/user.entity';

export enum FileStatus {
  PENDING = 'pending',
  READY = 'ready',
}

export enum FileVisibility {
  PRIVATE = 'private',
  PUBLIC = 'public',
}

export enum FileEntityType {
  USER = 'user',
  PRODUCT = 'product',
}

@Entity('files')
@Index('UQ_files_object_key', ['objectKey'], { unique: true })
export class FileRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'owner_user_id' })
  ownerUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_user_id' })
  ownerUser: User;

  @Column({ type: 'varchar', length: 512, name: 'object_key' })
  objectKey: string;

  @Column({ type: 'varchar', length: 120 })
  bucket: string;

  @Column({ type: 'varchar', length: 120, name: 'content_type' })
  contentType: string;

  @Column({ type: 'integer', name: 'size_bytes' })
  sizeBytes: number;

  @Column({
    type: 'enum',
    enum: FileStatus,
    default: FileStatus.PENDING,
  })
  status: FileStatus;

  @Column({
    type: 'enum',
    enum: FileVisibility,
    default: FileVisibility.PUBLIC,
  })
  visibility: 'private' | 'public';

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt: Date | null;

  @Column({
    type: 'enum',
    enum: FileEntityType,
    name: 'entity_type',
    nullable: true,
  })
  entityType: FileEntityType | null;

  @Column({ type: 'uuid', name: 'entity_id', nullable: true })
  entityId: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
