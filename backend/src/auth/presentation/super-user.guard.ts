import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import type { AuthenticatedUser } from './jwt-auth.guard.js';

@Injectable()
export class SuperUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
    }>();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException(
        'No se pudo identificar al usuario',
      );
    }

    const isSuperUser = user.roles.includes('SUPERUSUARIO');

    if (!isSuperUser) {
      throw new ForbiddenException(
        'Se requiere el rol SUPERUSUARIO',
      );
    }

    return true;
  }
}