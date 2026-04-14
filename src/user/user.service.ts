import { Injectable } from '@nestjs/common';
import { RegisterUserDto } from './dto/registerUser.dto';

@Injectable()
export class UserService {
  createUser(registerUserDto: RegisterUserDto) {
    // Implementation for creating a user
  }
}
