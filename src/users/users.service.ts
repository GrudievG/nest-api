import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  private readonly users = new Map<string, User>();

  create(createUserDto: CreateUserDto) {
    const users = Array.from(this.users.values());

    const isExists = users.some((u) => u.email === createUserDto.email);
    if (isExists) {
      throw new ConflictException('User already exists');
    }

    const now = new Date().toISOString();
    const user: User = {
      id: crypto.randomUUID(),
      ...createUserDto,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(user.id, user);

    return user;
  }

  findAll(
    offset: number,
    limit: number,
  ): {
    items: User[];
    offset: number;
    limit: number;
    total: number;
  } {
    const total = this.users.size;
    const items = Array.from(this.users.values())
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(offset, offset + limit);

    return { items, offset, limit, total };
  }

  findOne(id: string): User {
    const user = this.users.get(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    const user = this.users.get(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const patch: Partial<User> = {};
    if (updateUserDto.email !== undefined) {
      const usedEmail = Array.from(this.users.values()).some(
        (u) => u.email === updateUserDto.email && u.id !== id,
      );
      if (usedEmail) {
        throw new ConflictException('Email is already in use');
      }
      patch.email = updateUserDto.email;

      if (updateUserDto.firstName !== undefined) {
        patch.firstName = updateUserDto.firstName;
      }

      if (updateUserDto.lastName !== undefined) {
        patch.lastName = updateUserDto.lastName;
      }

      if (updateUserDto.age !== undefined) {
        patch.age = updateUserDto.age;
      }

      const updatedUser: User = {
        ...user,
        ...patch,
        updatedAt: new Date().toISOString(),
      };

      this.users.set(id, updatedUser);
      return updatedUser;
    }
  }

  remove(id: string): void {
    const deleted = this.users.delete(id);

    if (!deleted) {
      throw new NotFoundException('User not found');
    }
  }
}
