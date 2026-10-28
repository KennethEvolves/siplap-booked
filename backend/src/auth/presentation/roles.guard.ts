import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedUser } from './jwt-auth.guard.js';
import { ROLES_KEY, PERMISSIONS_KEY } from './roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Obtener los roles y permisos requeridos anotados en la ruta o controlador
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si la ruta no exige roles ni permisos específicos, se permite el acceso
    if (!requiredRoles && !requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser & { permissions?: string[] };
    }>();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No se pudo identificar al usuario');
    }

    // 2. Validar Roles si la ruta los exige
    if (requiredRoles && requiredRoles.length > 0) {
      const userRoles = user.roles || [];
      const hasRole = requiredRoles.some((role) => userRoles.includes(role));

      if (!hasRole) {
        throw new ForbiddenException(
          `Acceso denegado: se requiere uno de los roles [${requiredRoles.join(', ')}]`,
        );
      }
    }

    // 3. Validar Permisos si la ruta los exige
    if (requiredPermissions && requiredPermissions.length > 0) {
      const userPermissions = user.permissions || [];
      const hasPermission = requiredPermissions.some((perm) =>
        userPermissions.includes(perm),
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          `Acceso denegado: permisos insuficientes [${requiredPermissions.join(', ')}]`,
        );
      }
    }

    return true;
  }
}