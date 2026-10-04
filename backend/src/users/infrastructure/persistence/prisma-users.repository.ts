import { prismaWrite } from '../../../common/infrastructure/prisma-error.js';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service.js';

import type { User } from '../../domain/entities/user.entity.js';

import {
  type CreateUserData,
  UsersRepository,
} from '../../domain/ports/users.repository.js';

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsByEmail(email: string, excludeId?: string): Promise<boolean> {
    const user = await this.prisma.users.findFirst({
      where: {
        email,
        user_id: excludeId ? { not: excludeId } : undefined,
      },

      select: {
        user_id: true,
      },
    });

    return user !== null;
  }

  async create(data: CreateUserData): Promise<User> {
    const activeStatus = await this.prisma.user_statuses.findFirst({
      where: {
        name: 'ACTIVE',
      },

      select: {
        status_id: true,
      },
    });

    if (!activeStatus) {
      throw new Error('No existe el estado ACTIVE en user_statuses');
    }

    const user = await prismaWrite(() =>
      this.prisma.users.create({
        data: {
          username: data.username,
          email: data.email,
          password_hash: data.passwordHash,
          status_id: activeStatus.status_id,
        },

        select: {
          user_id: true,
          username: true,
          email: true,
          created_at: true,
          type_id: true,
          department_id: true,

          user_roles: { select: { roles: { select: { role_id: true, name: true } } } },
        user_statuses: {
            select: {
              name: true,
            },
          },
        },
      }),
    );

    return {
      userId: user.user_id,
      username: user.username,
      email: user.email,
      status: user.user_statuses.name,
      roles: user.user_roles.map(({ roles }) => ({ roleId: roles.role_id, name: roles.name })),
      typeId: user.type_id,
      departmentId: user.department_id,
      createdAt: user.created_at,
    };
  }

  async findAll(): Promise<User[]> {
    const users = await this.prisma.users.findMany({
      select: {
        user_id: true,
        username: true,
        email: true,
        created_at: true,
        type_id: true,
        department_id: true,

        user_roles: { select: { roles: { select: { role_id: true, name: true } } } },
        user_statuses: {
          select: {
            name: true,
          },
        },
      },

      orderBy: {
        username: 'asc',
      },
    });

    return users.map((user) => ({
      userId: user.user_id,
      username: user.username,
      email: user.email,
      status: user.user_statuses.name,
      roles: user.user_roles.map(({ roles }) => ({ roleId: roles.role_id, name: roles.name })),
      typeId: user.type_id,
      departmentId: user.department_id,
      createdAt: user.created_at,
    }));
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.users.findUnique({
      where: { user_id: id },
      select: {
        user_id: true,
        username: true,
        email: true,
        created_at: true,
        type_id: true,
        department_id: true,

        user_roles: { select: { roles: { select: { role_id: true, name: true } } } },
        user_statuses: {
          select: {
            name: true,
          },
        },
      },
    });
    return user
      ? {
          userId: user.user_id,
          username: user.username,
          email: user.email,
          status: user.user_statuses.name,
      roles: user.user_roles.map(({ roles }) => ({ roleId: roles.role_id, name: roles.name })),
          typeId: user.type_id,
          departmentId: user.department_id,
          createdAt: user.created_at,
        }
      : null;
  }
  async update(id: string, data: Partial<CreateUserData>): Promise<User> {
    const user = await prismaWrite(() =>
      this.prisma.users.update({
        where: { user_id: id },
        data: {
          username: data.username,
          email: data.email,
          password_hash: data.passwordHash,
          updated_at: new Date(),
        },
        select: {
          user_id: true,
          username: true,
          email: true,
          created_at: true,
          type_id: true,
          department_id: true,

          user_roles: { select: { roles: { select: { role_id: true, name: true } } } },
        user_statuses: {
            select: {
              name: true,
            },
          },
        },
      }),
    );
    return {
      userId: user.user_id,
      username: user.username,
      email: user.email,
      status: user.user_statuses.name,
      roles: user.user_roles.map(({ roles }) => ({ roleId: roles.role_id, name: roles.name })),
      typeId: user.type_id,
      departmentId: user.department_id,
      createdAt: user.created_at,
    };
  }
  async delete(id: string): Promise<void> {
    await prismaWrite(() =>
      this.prisma.$transaction(async (tx) => {
        await tx.user_roles.deleteMany({ where: { user_id: id } });
        await tx.users.delete({ where: { user_id: id } });
      }),
    );
  }
}
