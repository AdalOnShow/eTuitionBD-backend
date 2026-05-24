import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

interface RequestWithUser extends Request {
  user?: {
    sub: string;
    email: string;
    role: string;
  };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractToken(request);

    if (!token) {
      return false;
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      }) as RequestWithUser['user'];
      request.user = payload;
      return true;
    } catch {
      return false;
    }
  }

  private extractToken(request: RequestWithUser): string | null {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) {
      return null;
    }

    const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
    const accessTokenCookie = cookies.find((cookie) =>
      cookie.startsWith('access_token='),
    );

    return accessTokenCookie
      ? accessTokenCookie.split('=').slice(1).join('=')
      : null;
  }
}
