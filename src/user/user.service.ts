import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  private async generateUniqueUsername(email: string): Promise<string> {
    const emailPrefix = email.split('@')[0];
    let username = '';
    let isUnique = false;

    while (!isUnique) {
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      username = `${emailPrefix}${randomSuffix}`;

      const existingUser = await this.prisma.user.findFirst({
        where: { username },
      });

      if (!existingUser) {
        isUnique = true;
      }
    }

    return username;
  }

  async create(createUserDto: CreateUserDto) {
    try {
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
      const username = await this.generateUniqueUsername(createUserDto.email);

      const user = await this.prisma.user.create({
        data: {
          email: createUserDto.email,
          password: hashedPassword,
          name: createUserDto.name,
          username: username,
          role: createUserDto.role || 'student',
        },
      });
      console.log('User created in database:', user);

      // if user creation succeeds, we can return the created user data (excluding the password) and success message
      if (!user) {
        throw new InternalServerErrorException(
          'Failed to create the user. Please try again.',
        );
      }

      return {
        message: 'User created successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          role: user.role,
        },
      };
    } catch (err) {
      console.log('Error in user creation:', err);
      // Prisma unique constraint violation → P2002
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'An account with this email already exists. Please use a different email or log in.',
        );
      } else if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2003'
      ) {
        throw new ConflictException(
          'An account with this username already exists. Please use a different username.',
        );
      } else {
        throw new InternalServerErrorException(
          'Something went wrong while creating the user. Please try again.',
        );
      }
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

  async findByEmail(email: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { email } });
      return user;
    } catch {
      throw new InternalServerErrorException(
        'Failed to fetch the user. Please try again.',
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
