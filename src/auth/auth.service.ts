import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { EmailService } from 'src/email/email.service';
import { RedisService } from 'src/redis/redis.service';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly isDev: boolean;

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    this.isDev = this.configService.get('NODE_ENV') !== 'production';
  }

  private generateSixDigitCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateTokens(payload: {
    sub: string;
    email: string;
    role: string;
    name: string | null;
  }) {
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: '1h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }

  async registerUser(createUserDto: CreateUserDto) {
    if (this.isDev) {
      this.logger.log(`🆕 New registration attempt: ${createUserDto.email}`);
    }

    const result = await this.userService.create(createUserDto);
    const user = result.user;

    if (this.isDev) {
      this.logger.log(`✅ User created: ${user.email} (ID: ${user.id})`);
    }

    const code = this.generateSixDigitCode();
    const redisKey = `email_verify:${user.id}`;
    await this.redisService.set(redisKey, code, 60 * 10);

    if (this.isDev) {
      this.logger.debug(
        `🔑 OTP stored in Redis: key=${redisKey}, code=${code}`,
      );
    }

    await this.emailService.sendVerificationCode(user.email, code);

    if (this.isDev) {
      this.logger.log(`📧 Verification email dispatched to: ${user.email}`);
    }

    return {
      success: true,
      message:
        'Registration successful. Please check your email for the verification code.',
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
      },
    };
  }

  async verifyEmail(userId: string, code: string) {
    if (this.isDev) {
      this.logger.log(`🔍 Email verification attempt: userId=${userId}`);
    }

    const redisKey = `email_verify:${userId}`;
    const storedCodeRaw = await this.redisService.get(redisKey);

    if (!storedCodeRaw) {
      if (this.isDev) this.logger.warn(`⏰ OTP expired for userId=${userId}`);
      throw new BadRequestException(
        'Verification code has expired. Please request a new one.',
      );
    }

    const storedCode = String(storedCodeRaw);
    if (storedCode !== code) {
      if (this.isDev) this.logger.warn(`❌ Invalid OTP for userId=${userId}`);
      throw new BadRequestException('Invalid verification code.');
    }

    await this.userService.markEmailVerified(userId);
    await this.redisService.delete(redisKey);

    const user = await this.userService.findOne(userId);

    if (this.isDev) {
      this.logger.log(`✅ Email verified for: ${user.email} (ID: ${userId})`);
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const { accessToken, refreshToken } = this.generateTokens(payload);

    return {
      success: true,
      message: 'Email verified successfully.',
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

  async resendVerificationCode(userId: string) {
    if (this.isDev) {
      this.logger.log(`🔄 Resend verification requested for userId=${userId}`);
    }

    const user = await this.userService.findOne(userId);

    if (user.isEmailVerified) {
      if (this.isDev)
        this.logger.warn(`⚠️ Email already verified for userId=${userId}`);
      throw new BadRequestException('Email is already verified.');
    }

    const code = this.generateSixDigitCode();
    const redisKey = `email_verify:${userId}`;
    await this.redisService.set(redisKey, code, 60 * 10);
    await this.emailService.sendVerificationCode(user.email, code);

    if (this.isDev) {
      this.logger.log(`📧 Verification code resent to: ${user.email}`);
    }

    return {
      success: true,
      message: 'A new verification code has been sent to your email.',
    };
  }

  async login(identifier: string, password: string) {
    if (this.isDev) {
      this.logger.log(`🔐 Login attempt: ${identifier}`);
    }

    const user = await this.userService.findByEmailOrUsername(identifier);

    if (!user || !user.password) {
      if (this.isDev)
        this.logger.warn(`❌ Login failed — user not found: ${identifier}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      if (this.isDev)
        this.logger.warn(`❌ Login failed — wrong password: ${identifier}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      if (this.isDev)
        this.logger.warn(
          `⚠️ Login blocked — email not verified: ${user.email}`,
        );
      throw new UnauthorizedException({
        message: 'Please verify your email before logging in.',
        code: 'EMAIL_NOT_VERIFIED',
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
        },
      });
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const { accessToken, refreshToken } = this.generateTokens(payload);

    if (this.isDev) {
      this.logger.log(
        `✅ Login successful: ${user.email} (role: ${user.role})
`,
      );
    }

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

  async forgotPassword(email: string) {
    const normalizedEmail = email.toLowerCase().trim();

    if (this.isDev) {
      this.logger.log(`🔑 Forgot password request for: ${normalizedEmail}`);
    }

    const user = await this.userService.findByEmail(normalizedEmail);

    if (!user) {
      if (this.isDev)
        this.logger.warn(`⚠️ Forgot password — no account: ${normalizedEmail}`);
      return {
        success: true,
        message:
          'If an account exists for that email, a reset code has been sent.',
      };
    }

    const code = this.generateSixDigitCode();
    const redisKey = `password_reset:${normalizedEmail}`;
    await this.redisService.set(redisKey, code, 60 * 15);
    await this.emailService.sendPasswordResetCode(normalizedEmail, code);

    if (this.isDev) {
      this.logger.log(`📧 Password reset email sent to: ${normalizedEmail}`);
    }

    return {
      success: true,
      message:
        'If an account exists for that email, a reset code has been sent.',
    };
  }

  async resetPassword(email: string, code: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();

    if (this.isDev) {
      this.logger.log(`🔄 Password reset attempt for: ${normalizedEmail}`);
    }

    const redisKey = `password_reset:${normalizedEmail}`;
    const storedCodeRaw = await this.redisService.get(redisKey);

    if (!storedCodeRaw) {
      if (this.isDev)
        this.logger.warn(`⏰ Reset code expired: ${normalizedEmail}`);
      throw new BadRequestException(
        'Reset code has expired. Please request a new one.',
      );
    }

    const storedCode = String(storedCodeRaw);
    if (storedCode !== code) {
      if (this.isDev)
        this.logger.warn(`❌ Invalid reset code: ${normalizedEmail}`);
      throw new BadRequestException('Invalid reset code.');
    }

    const user = await this.userService.findByEmail(normalizedEmail);

    if (!user) {
      throw new BadRequestException('User not found.');
    }

    await this.userService.updatePassword(user.id, password);
    await this.redisService.delete(redisKey);

    if (this.isDev) {
      this.logger.log(`✅ Password reset successful for: ${normalizedEmail}`);
    }

    return {
      success: true,
      message: 'Password updated successfully.',
    };
  }
}
