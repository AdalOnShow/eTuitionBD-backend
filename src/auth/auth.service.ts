import { Injectable } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async registerUser(createUserDto: CreateUserDto) {
    //? Logic for registering a user
    // Create the user (password hashing is done in user.service.ts)
    const result = await this.userService.create(createUserDto);

    // Generate a JWT token for the user (implementation not shown here)
    const payload = { sub: result.id, email: result.email, role: result.role };
    const token = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET,
    });

    const returnPayload = {
      status: 'success',
      statusCode: 201,
      message: 'User registered successfully',
      data: {
        id: result.id,
        role: result.role,
      },
      accessToken: token,
    };

    return { ...returnPayload };
  }
}
