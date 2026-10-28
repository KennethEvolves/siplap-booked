import { Injectable } from '@nestjs/common';
import type { UpdateProfile, UserProfile } from '@shared/contracts';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { prismaWrite } from '../../../common/infrastructure/prisma-error.js';
import { ProfileRepository } from '../../domain/ports/profile.repository.js';

const select = {
  user_id: true,
  username: true,
  email: true,
  created_at: true,
  updated_at: true,
  user_statuses: { select: { status_id: true, name: true } },
  user_types: { select: { type_id: true, name: true } },
  departments: { select: { department_id: true, name: true } },
  user_roles: { select: { roles: { select: { role_id: true, name: true } } } },
  profiles: {
    select: {
      first_name: true,
      last_name: true,
      phone_number: true,
      avatar_url: true,
      date_of_birth: true,
      bio: true,
      shift: true,
    },
  },
} satisfies Prisma.usersSelect;
type ProfileRow = Prisma.usersGetPayload<{ select: typeof select }>;
function map(user: ProfileRow): UserProfile {
  const profile = user.profiles;
  return {
    userId: user.user_id,
    username: user.username,
    email: user.email,
    status: {
      statusId: user.user_statuses.status_id,
      name: user.user_statuses.name,
    },
    userType: user.user_types
      ? { typeId: user.user_types.type_id, name: user.user_types.name }
      : null,
    department: user.departments
      ? {
          departmentId: user.departments.department_id,
          name: user.departments.name,
        }
      : null,
    roles: user.user_roles.map(({ roles }) => ({
      roleId: roles.role_id,
      name: roles.name,
    })),
    firstName: profile?.first_name ?? null,
    lastName: profile?.last_name ?? null,
    phoneNumber: profile?.phone_number ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    dateOfBirth: profile?.date_of_birth.toISOString().slice(0, 10) ?? null,
    bio: profile?.bio ?? null,
    shift: profile?.shift ?? null,
    createdAt: user.created_at?.toISOString() ?? null,
    updatedAt: user.updated_at?.toISOString() ?? null,
  };
}
@Injectable()
export class PrismaProfileRepository implements ProfileRepository {
  constructor(private readonly prisma: PrismaService) {}
  async findByUserId(userId: string): Promise<UserProfile | null> {
    const user = await this.prisma.users.findUnique({
      where: { user_id: userId },
      select,
    });
    return user ? map(user) : null;
  }
  async update(userId: string, input: UpdateProfile): Promise<UserProfile> {
    return prismaWrite(() =>
      this.prisma.$transaction(async (tx) => {
        await tx.users.update({
          where: { user_id: userId },
          data: {
            username: input.username,
            email: input.email,
            updated_at: new Date(),
          },
        });
        const data = {
          first_name: input.firstName,
          last_name: input.lastName,
          phone_number: input.phoneNumber,
          avatar_url: input.avatarUrl,
          bio: input.bio,
          date_of_birth:
            input.dateOfBirth === undefined
              ? undefined
              : new Date(input.dateOfBirth + 'T00:00:00Z'),
        };
        if (Object.values(data).some((value) => value !== undefined)) {
          const existing = await tx.profiles.findUnique({
            where: { user_id: userId },
            select: { user_id: true },
          });
          if (existing)
            await tx.profiles.update({ where: { user_id: userId }, data });
          else {
            if (!data.date_of_birth)
              throw new Error('La fecha de nacimiento es obligatoria');
            await tx.profiles.create({
              data: {
                ...data,
                date_of_birth: data.date_of_birth,
                user_id: userId,
              },
            });
          }
        }
        const user = await tx.users.findUniqueOrThrow({
          where: { user_id: userId },
          select,
        });
        return map(user);
      }),
    );
  }
}
