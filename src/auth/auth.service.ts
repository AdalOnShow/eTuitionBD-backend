import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  private generateTokens(payload: any) {
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '1h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }

  async registerUser(createUserDto: CreateUserDto) {
    const result = await this.userService.create(createUserDto);

    const payload = {
      sub: result.user.id,
      email: result.user.email,
      role: result.user.role,
    };

    const { accessToken, refreshToken } = this.generateTokens(payload);

    return {
      success: true,
      message: 'User registered successfully',
      data: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        username: result.user.username,
        role: result.user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(email: string, password: string) {
    const user = await this.userService.findByEmail(email);

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const { accessToken, refreshToken } = this.generateTokens(payload);

    return {
      success: true,
      message: 'Login successful',
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }
}
