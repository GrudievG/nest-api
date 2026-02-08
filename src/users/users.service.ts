import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}
  private readonly users = new Map<string, User>();

  async create(createUserDto: CreateUserDto) {
    const existing = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existing) {
      throw new ConflictException('User already exists');
    }

    const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);
  }

  // TODO: Implement pagination
  async findAll(
    offset: number,
    limit: number,
  ): Promise<{
    items: User[];
    offset: number;
    limit: number;
    total: number;
  }> {
    const total = this.users.size;
    const items = await this.usersRepository.find({
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit,
    });

    return { items, offset, limit, total };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // TODO: Implement actual integration with DB
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

      const updatedUser: User = {
        ...user,
        ...patch,
      };

      this.users.set(id, updatedUser);
      return updatedUser;
    }
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.usersRepository.delete(id);

    if (!deleted) {
      throw new NotFoundException('User not found');
    }
  }
}
