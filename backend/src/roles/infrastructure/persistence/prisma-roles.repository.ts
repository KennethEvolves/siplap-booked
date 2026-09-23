import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service.js';

import type { Role } from '../../domain/entities/role.entity.js';

import {
  type CreateRoleData,
  RolesRepository,
} from '../../domain/ports/roles.repository.js';

@Injectable()
export class PrismaRolesRepository
  implements RolesRepository
{
  constructor(
    private readonly prisma:
      PrismaService,
  ) {}

  async existsByName(
    name: string,
  ): Promise<boolean> {
    const role =
      await this.prisma.roles.findFirst({
        where: {
          name,
        },

        select: {
          role_id: true,
        },
      });

    return role !== null;
  }

  async create(
    data: CreateRoleData,
  ): Promise<Role> {
    const role =
      await this.prisma.roles.create({
        data: {
          name: data.name,
          description:
            data.description,
        },

        select: {
          role_id: true,
          name: true,
          description: true,
          created_at: true,
          updated_at: true,
        },
      });

    return {
      roleId: role.role_id,
      name: role.name,
      description:
        role.description,
      createdAt:
        role.created_at,
      updatedAt:
        role.updated_at,
    };
  }

  async findAll(): Promise<Role[]> {
    const roles =
      await this.prisma.roles.findMany({
        select: {
          role_id: true,
          name: true,
          description: true,
          created_at: true,
          updated_at: true,
        },

        orderBy: {
          name: 'asc',
        },
      });

    return roles.map((role) => ({
      roleId: role.role_id,
      name: role.name,
      description:
        role.description,
      createdAt:
        role.created_at,
      updatedAt:
        role.updated_at,
    }));
  }
}