import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service.js';

import type { AuthUser } from '../../domain/entities/auth-user.entity.js';
import { UserRepository } from '../../domain/ports/user.repository.js';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findById(id: string): Promise<AuthUser | null> {
    return this.findUser({ user_id: id });
  }

  async findByEmail(email: string): Promise<AuthUser | null> {
    return this.findUser({ email });
  }

  private async findUser(where: { user_id?: string; email?: string }): Promise<AuthUser | null> {
    const user = await this.prisma.users.findFirst({
      where,

      select: {
        user_id: true,
        username: true,
        email: true,
        password_hash: true,

        user_statuses: {
          select: {
            name: true,
          },
        },

        user_roles: {
          select: {
            roles: {
              select: {
                name: true,
                role_permissions: {
                  select: {
                    permissions: {
                      select: {
                        slug: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    const roles = user.user_roles
      .map((userRole) => userRole.roles.name)
      .filter((role): role is string => role !== null);

    // Extraer y aplanar todos los slugs de permisos únicos de todos sus roles
    const permissionsSet = new Set<string>();
    for (const ur of user.user_roles) {
      const rolePerms = ur.roles?.role_permissions || [];
      for (const rp of rolePerms) {
        if (rp.permissions?.slug) {
          permissionsSet.add(rp.permissions.slug);
        }
      }
    }
    const permissions = Array.from(permissionsSet);

    return {
      userId: user.user_id,
      username: user.username,
      email: user.email,
      passwordHash: user.password_hash,
      status: user.user_statuses?.name ?? null,
      roles,
      permissions,
    };
  }
}
