import { prismaWrite } from '../../../common/infrastructure/prisma-error.js';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service.js';

import {
  type UserRoleAssignment,
  UserRoleRepository,
} from '../../domain/ports/user-role.repository.js';

@Injectable()
export class PrismaUserRoleRepository implements UserRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async userExists(userId: string): Promise<boolean> {
    const user = await this.prisma.users.findFirst({
      where: {
        user_id: userId,
      },

      select: {
        user_id: true,
      },
    });

    return user !== null;
  }

  async roleExists(roleId: string): Promise<boolean> {
    const role = await this.prisma.roles.findFirst({
      where: {
        role_id: roleId,
      },

      select: {
        role_id: true,
      },
    });

    return role !== null;
  }

  async assignmentExists(userId: string, roleId: string): Promise<boolean> {
    const assignment = await this.prisma.user_roles.findFirst({
      where: {
        user_id: userId,
        role_id: roleId,
      },

      select: {
        user_id: true,
      },
    });

    return assignment !== null;
  }

  async assignRole(
    userId: string,
    roleId: string,
  ): Promise<UserRoleAssignment> {
    const assignment = await prismaWrite(() =>
      this.prisma.user_roles.create({
        data: {
          user_id: userId,
          role_id: roleId,
        },

        select: {
          user_id: true,
          role_id: true,
          created_at: true,
        },
      }),
    );

    return {
      userId: assignment.user_id,
      roleId: assignment.role_id,
      createdAt: assignment.created_at,
    };
  }
}
