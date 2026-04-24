import {
  Injectable,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    try {
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
      return await this.prisma.user.create({
        data: {
          email: createUserDto.email,
          password: hashedPassword,
          name: createUserDto.name,
          role: createUserDto.role || 'student',
        },
      });
    } catch (err) {
      // Prisma unique constraint violation → P2002
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'An account with this email already exists. Please use a different email or log in.',
        );
      }
      throw new InternalServerErrorException(
        'Something went wrong while creating the user. Please try again.',
      );
    }
  }

  async findAll() {
    try {
      return await this.prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });
    } catch {
      throw new InternalServerErrorException(
        'Failed to fetch users. Please try again.',
      );
    }
  }

  async findOne(id: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id } });
      if (!user) {
        throw new NotFoundException(`User with id "${id}" not found.`);
      }
      return user;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException(
        'Failed to fetch the user. Please try again.',
      );
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      // Ensure the user exists first
      await this.findOne(id);
      return await this.prisma.user.update({
        where: { id },
        data: updateUserDto,
      });
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof ConflictException
      ) {
        throw err;
      }
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'An account with this email already exists.',
        );
      }
      throw new InternalServerErrorException(
        'Failed to update the user. Please try again.',
      );
    }
  }

  async remove(id: string) {
    try {
      // Ensure the user exists first
      await this.findOne(id);
      return await this.prisma.user.delete({ where: { id } });
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException(
        'Failed to delete the user. Please try again.',
      );
    }
  }
}
