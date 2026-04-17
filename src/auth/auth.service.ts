import { Injectable } from '@nestjs/common';
import { RegisterUserDto } from 'src/user/dto/registerUser.dto';
import { UserService } from 'src/user/user.service';
import bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt/dist/jwt.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async registerUser(registerUserDto: RegisterUserDto) {
    //? Logic for registering a user

    // Hash the password before saving the user
    const hashedPass = await bcrypt.hash(registerUserDto.password, 10);

    // Create the user with the hashed password
    const result = await this.userService.createUser({
      ...registerUserDto,
      password: hashedPass,
    });

    // Generate a JWT token for the user (implementation not shown here)
    const payload = { sub: result._id, email: result.email, role: result.role };
    const token = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '1h',
    });

    const returnPayload = {
      status: 'success',
      statusCode: 201,
      message: 'User registered successfully',
      data: {
        _id: result._id,
        role: result.role,
      },
      accessToken: token,
    };

    return { ...returnPayload };
  }
}
