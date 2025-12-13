import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from './public.decorator';

export interface JwtPayload {
  sub: string;      // User ID
  name: string;     // User's full name
  email: string;    // User's email
  role: string;     // User's role (admin, trainer, member)
  iat: number;      // Issued at timestamp
  exp: number;      // Expiration timestamp
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET') || 'change-this-secret-in-production';
      const payload = jwt.verify(token, secret) as JwtPayload;
      
      // Attach user info to request
      request.user = {
        userId: payload.sub,
        name: payload.name,
        email: payload.email,
        role: payload.role,
      };
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException({
          message: 'Token has expired',
          code: 'TOKEN_EXPIRED',
        });
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException({
          message: 'Invalid token',
          code: 'INVALID_TOKEN',
        });
      }
      throw new UnauthorizedException('Token verification failed');
    }

    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const authorization = request.headers?.authorization;
    if (!authorization) {
      return undefined;
    }

    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
