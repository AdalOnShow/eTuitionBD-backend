import { ConflictException, Injectable } from '@nestjs/common';
import { RegisterUserDto } from './dto/registerUser.dto';
import { User } from './schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async createUser(registerUserDto: RegisterUserDto) {
    try {
      return await this.userModel.create({
        ...registerUserDto,
      });
    } catch (err) {
      const error = err as { code?: number };

      const DUPLICATE_KEY_ERROR_CODE = 11000;
      if (error.code === DUPLICATE_KEY_ERROR_CODE) {
        throw new ConflictException('User with this email already exists');
      }

      throw err;
    }
  }
}
