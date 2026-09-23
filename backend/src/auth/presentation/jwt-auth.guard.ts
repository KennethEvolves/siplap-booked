import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  roles: string[];
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException(
        'Token de autenticación requerido',
      );
    }

    const [type, token] = authorization.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException(
        'Formato de token inválido',
      );
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<AuthenticatedUser>(token);

      request.user = payload;

      return true;
    } catch {
      throw new UnauthorizedException(
        'Token inválido o expirado',
      );
    }
  }
}