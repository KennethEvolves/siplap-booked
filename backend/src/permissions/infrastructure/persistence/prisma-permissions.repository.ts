import { prismaWrite } from '../../../common/infrastructure/prisma-error.js';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service.js';

import type { Permission } from '../../domain/entities/permission.entity.js';

import {
  type CreatePermissionData,
  PermissionsRepository,
} from '../../domain/ports/permissions.repository.js';

@Injectable()
export class PrismaPermissionsRepository implements PermissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
    const permission = await this.prisma.permissions.findFirst({
      where: {
        slug,
        permission_id: excludeId ? { not: excludeId } : undefined,
      },

      select: {
        permission_id: true,
      },
    });

    return permission !== null;
  }

  async create(data: CreatePermissionData): Promise<Permission> {
    const permission = await prismaWrite(() =>
      this.prisma.permissions.create({
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
        },

        select: {
          permission_id: true,
          name: true,
          slug: true,
          description: true,
          created_at: true,
          updated_at: true,
        },
      }),
    );

    return {
      permissionId: permission.permission_id,

      name: permission.name,

      slug: permission.slug,

      description: permission.description,

      createdAt: permission.created_at,

      updatedAt: permission.updated_at,
    };
  }

  async findAll(): Promise<Permission[]> {
    const permissions = await this.prisma.permissions.findMany({
      select: {
        permission_id: true,
        name: true,
        slug: true,
        description: true,
        created_at: true,
        updated_at: true,
      },

      orderBy: {
        name: 'asc',
      },
    });

    return permissions.map((permission) => ({
      permissionId: permission.permission_id,

      name: permission.name,

      slug: permission.slug,

      description: permission.description,

      createdAt: permission.created_at,

      updatedAt: permission.updated_at,
    }));
  }

  async findById(id: string): Promise<Permission | null> {
    const permission = await this.prisma.permissions.findUnique({
      where: { permission_id: id },
      select: {
        permission_id: true,
        name: true,
        slug: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    });
    return permission
      ? {
          permissionId: permission.permission_id,
          name: permission.name,
          slug: permission.slug,
          description: permission.description,
          createdAt: permission.created_at,
          updatedAt: permission.updated_at,
        }
      : null;
  }
  async update(
    id: string,
    data: Partial<CreatePermissionData>,
  ): Promise<Permission> {
    const permission = await prismaWrite(() =>
      this.prisma.permissions.update({
        where: { permission_id: id },
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          updated_at: new Date(),
        },
        select: {
          permission_id: true,
          name: true,
          slug: true,
          description: true,
          created_at: true,
          updated_at: true,
        },
      }),
    );
    return {
      permissionId: permission.permission_id,
      name: permission.name,
      slug: permission.slug,
      description: permission.description,
      createdAt: permission.created_at,
      updatedAt: permission.updated_at,
    };
  }
  async delete(id: string): Promise<void> {
    await prismaWrite(() =>
      this.prisma.$transaction(async (tx) => {
        await tx.role_permissions.deleteMany({ where: { permission_id: id } });
        await tx.permissions.delete({ where: { permission_id: id } });
      }),
    );
  }
}
