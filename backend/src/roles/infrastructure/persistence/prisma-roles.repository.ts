import { prismaWrite } from '../../../common/infrastructure/prisma-error.js';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service.js';

import type { Role } from '../../domain/entities/role.entity.js';

import {
  type CreateRoleData,
  RolesRepository,
} from '../../domain/ports/roles.repository.js';

@Injectable()
export class PrismaRolesRepository implements RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsByName(name: string, excludeId?: string): Promise<boolean> {
    const role = await this.prisma.roles.findFirst({
      where: {
        name,
        role_id: excludeId ? { not: excludeId } : undefined,
      },

      select: {
        role_id: true,
      },
    });

    return role !== null;
  }

  async create(data: CreateRoleData): Promise<Role> {
    const role = await prismaWrite(() =>
      this.prisma.roles.create({
        data: {
          name: data.name,
          description: data.description,
        },

        select: {
          role_id: true,
          name: true,
          description: true,
          role_permissions: { select: { permissions: { select: { permission_id: true, name: true, slug: true } } } },
          created_at: true,
          updated_at: true,
        },
      }),
    );

    return {
      roleId: role.role_id,
      permissions: role.role_permissions.map(({ permissions }) => ({ permissionId: permissions.permission_id, name: permissions.name, slug: permissions.slug })),
      name: role.name,
      description: role.description,
      createdAt: role.created_at,
      updatedAt: role.updated_at,
    };
  }

  async findAll(): Promise<Role[]> {
    const roles = await this.prisma.roles.findMany({
      select: {
        role_id: true,
        name: true,
        description: true,
        role_permissions: { select: { permissions: { select: { permission_id: true, name: true, slug: true } } } },
          created_at: true,
        updated_at: true,
      },

      orderBy: {
        name: 'asc',
      },
    });

    return roles.map((role) => ({
      roleId: role.role_id,
      permissions: role.role_permissions.map(({ permissions }) => ({ permissionId: permissions.permission_id, name: permissions.name, slug: permissions.slug })),
      name: role.name,
      description: role.description,
      createdAt: role.created_at,
      updatedAt: role.updated_at,
    }));
  }

  async findById(id: string): Promise<Role | null> {
    const role = await this.prisma.roles.findUnique({
      where: { role_id: id },
      select: {
        role_id: true,
        name: true,
        description: true,
        role_permissions: { select: { permissions: { select: { permission_id: true, name: true, slug: true } } } },
          created_at: true,
        updated_at: true,
      },
    });
    return role
      ? {
          roleId: role.role_id,
      permissions: role.role_permissions.map(({ permissions }) => ({ permissionId: permissions.permission_id, name: permissions.name, slug: permissions.slug })),
          name: role.name,
          description: role.description,
          createdAt: role.created_at,
          updatedAt: role.updated_at,
        }
      : null;
  }
  async update(id: string, data: Partial<CreateRoleData>): Promise<Role> {
    const role = await prismaWrite(() =>
      this.prisma.roles.update({
        where: { role_id: id },
        data: {
          name: data.name,
          description: data.description,
          updated_at: new Date(),
        },
        select: {
          role_id: true,
          name: true,
          description: true,
          role_permissions: { select: { permissions: { select: { permission_id: true, name: true, slug: true } } } },
          created_at: true,
          updated_at: true,
        },
      }),
    );
    return {
      roleId: role.role_id,
      permissions: role.role_permissions.map(({ permissions }) => ({ permissionId: permissions.permission_id, name: permissions.name, slug: permissions.slug })),
      name: role.name,
      description: role.description,
      createdAt: role.created_at,
      updatedAt: role.updated_at,
    };
  }
  async delete(id: string): Promise<void> {
    await prismaWrite(() =>
      this.prisma.$transaction(async (tx) => {
        await tx.role_permissions.deleteMany({ where: { role_id: id } });
        await tx.user_roles.deleteMany({ where: { role_id: id } });
        await tx.roles.delete({ where: { role_id: id } });
      }),
    );
  }
}
