import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateUserDto } from './user/dto/create-user.dto';
import { UserService } from './user/user.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    const regUserPayload = await this.userService.create(createUserDto);
    return regUserPayload;
  }

  @Get('users')
  async findAll() {
    return this.userService.findAll();
  }
}
