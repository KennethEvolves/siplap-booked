import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service.js';

import {
  type RolePermissionAssignment,
  RolePermissionRepository,
} from '../../domain/ports/role-permission.repository.js';

@Injectable()
export class PrismaRolePermissionRepository
  implements RolePermissionRepository
{
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async roleExists(
    roleId: string,
  ): Promise<boolean> {
    const role =
      await this.prisma.roles.findFirst({
        where: {
          role_id: roleId,
        },

        select: {
          role_id: true,
        },
      });

    return role !== null;
  }

  async permissionExists(
    permissionId: string,
  ): Promise<boolean> {
    const permission =
      await this.prisma.permissions.findFirst({
        where: {
          permission_id: permissionId,
        },

        select: {
          permission_id: true,
        },
      });

    return permission !== null;
  }

  async assignmentExists(
    roleId: string,
    permissionId: string,
  ): Promise<boolean> {
    const assignment =
      await this.prisma.role_permissions.findFirst({
        where: {
          role_id: roleId,
          permission_id: permissionId,
        },

        select: {
          role_id: true,
        },
      });

    return assignment !== null;
  }

  async assignPermission(
    roleId: string,
    permissionId: string,
  ): Promise<RolePermissionAssignment> {
    const assignment =
      await this.prisma.role_permissions.create({
        data: {
          role_id: roleId,
          permission_id: permissionId,
        },

        select: {
          role_id: true,
          permission_id: true,
          created_at: true,
        },
      });

    return {
      roleId: assignment.role_id,
      permissionId:
        assignment.permission_id,
      createdAt:
        assignment.created_at,
    };
  }
}