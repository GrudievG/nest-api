import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import bcrypt from 'bcrypt';
import { RegisterUserDto } from './dto/register-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}
  private static readonly SALT_ROUNDS = 10;
  private readonly users = new Map<string, User>();

  async create(
    registerUserDto: RegisterUserDto,
  ): Promise<Omit<User, 'passwordHash'>> {
    const email = registerUserDto.email.trim().toLowerCase();

    const passwordHash = await bcrypt.hash(
      registerUserDto.password,
      UsersService.SALT_ROUNDS,
    );

    try {
      const user = this.usersRepository.create({
        email,
        firstName: registerUserDto.firstName,
        lastName: registerUserDto.lastName,
        passwordHash,
        roles: [UserRole.USER],
        scopes: [],
      });

      const saved = await this.usersRepository.save(user);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash: _passwordHash, ...result } = saved;

      return result;
    } catch (error: unknown) {
      // Postgres unique violation
      if (error instanceof QueryFailedError) {
        const pgError = error as QueryFailedError & {
          driverError?: { code?: string };
        };

        if (pgError.driverError?.code === '23505') {
          throw new ConflictException('Email already registered');
        }
      }

      throw error;
    }
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
