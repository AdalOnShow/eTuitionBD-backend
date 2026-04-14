import { Injectable } from '@nestjs/common';
import { RegisterUserDto } from 'src/user/dto/registerUser.dto';
import { UserService } from 'src/user/user.service';
import bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService) {}
  async registerUser(registerUserDto: RegisterUserDto) {
    //? Logic for registering a user

    // Hash the password before saving the user
    const hashedPass = await bcrypt.hash(registerUserDto.password, 10);

    // Create the user with the hashed password
    const result = await this.userService.createUser({
      ...registerUserDto,
      password: hashedPass,
    });

    return result;
  }
}
