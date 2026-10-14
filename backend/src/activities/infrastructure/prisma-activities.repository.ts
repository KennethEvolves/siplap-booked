import { Injectable } from '@nestjs/common';
import type {
  Activity,
  ActivityList,
  ApproveActivity,
  CreateActivity,
  UpdateActivity,
} from '@shared/contracts';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RbacError } from '../../common/domain/rbac.error.js';
import { prismaWrite } from '../../common/infrastructure/prisma-error.js';
import { ActivitiesRepository } from '../domain/activities.repository.js';

const select = {
  activity_id: true,
  title: true,
  description: true,
  type: true,
  start_date: true,
  end_date: true,
  general_observation: true,
  requires_certified: true,
  requires_authority: true,
  objective_id: true,
  overall_status: true,
  created_at: true,
  updated_at: true,
  users: { select: { user_id: true, username: true } },
} satisfies Prisma.activitiesSelect;
function map(
  row: Prisma.activitiesGetPayload<{ select: typeof select }>,
): Activity {
  return {
    activityId: row.activity_id,
    title: row.title,
    description: row.description,
    type: row.type,
    startDate: row.start_date?.toISOString().slice(0, 10) ?? null,
    endDate: row.end_date?.toISOString().slice(0, 10) ?? null,
    generalObservation: row.general_observation,
    requiresCertified: row.requires_certified,
    requiresAuthority: row.requires_authority,
    objectiveId: row.objective_id,
    creator: { userId: row.users.user_id, username: row.users.username },
    status: row.overall_status,
    createdAt: row.created_at?.toISOString() ?? null,
    updatedAt: row.updated_at?.toISOString() ?? null,
  };
}
function data(input: UpdateActivity) {
  return {
    title: input.title,
    description: input.description,
    type: input.type,
    start_date:
      input.startDate === undefined
        ? undefined
        : new Date(input.startDate + 'T00:00:00Z'),
    end_date:
      input.endDate === undefined
        ? undefined
        : new Date(input.endDate + 'T00:00:00Z'),
    general_observation: input.generalObservation,
    requires_certified: input.requiresCertified,
    requires_authority: input.requiresAuthority,
    objective_id: input.objectiveId,
    updated_at: new Date(),
  };
}
@Injectable()
export class PrismaActivitiesRepository implements ActivitiesRepository {
  constructor(private readonly prisma: PrismaService) {}
  async permissions(userId: string) {
    const rows = await this.prisma.permissions.findMany({
      where: {
        role_permissions: {
          some: { roles: { user_roles: { some: { user_id: userId } } } },
        },
      },
      select: { slug: true },
    });
    return rows.map((row) => row.slug);
  }
  async list(query: ActivityList, creatorId?: string) {
    const where = { creator_id: creatorId };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.activities.findMany({
        where,
        select,
        orderBy: [{ created_at: 'desc' }, { activity_id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.activities.count({ where }),
    ]);
    return { activities: rows.map(map), total };
  }
  async find(activityId: string, creatorId?: string) {
    const row = await this.prisma.activities.findFirst({
      where: { activity_id: activityId, creator_id: creatorId },
      select,
    });
    return row ? map(row) : null;
  }
  async creators(query: ActivityList) {
    const where = { user_statuses: { name: 'ACTIVE' } };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.users.findMany({
        where,
        select: { user_id: true, username: true },
        orderBy: { user_id: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.users.count({ where }),
    ]);
    return {
      users: rows.map((row) => ({
        userId: row.user_id,
        username: row.username,
      })),
      total,
    };
  }
  async activeCreator(userId: string) {
    return !!(await this.prisma.users.findFirst({
      where: { user_id: userId, user_statuses: { name: 'ACTIVE' } },
      select: { user_id: true },
    }));
  }
  async create(input: CreateActivity & { creatorId: string }) {
    return prismaWrite(async () =>
      map(
        await this.prisma.activities.create({
          data: { ...data(input), creator_id: input.creatorId },
          select,
        }),
      ),
    );
  }
  async update(activityId: string, input: UpdateActivity, creatorId?: string) {
    try {
      return await prismaWrite(() =>
        this.prisma.$transaction(
          async (tx) => {
            const where = { activity_id: activityId, creator_id: creatorId };
            const existing = await tx.activities.findFirst({ where, select });
            if (!existing)
              throw new RbacError('not_found', 'Actividad no encontrada');
            const start =
              input.startDate ??
              existing.start_date?.toISOString().slice(0, 10);
            const end =
              input.endDate ?? existing.end_date?.toISOString().slice(0, 10);
            if (start && end && end < start)
              throw new RbacError(
                'invalid',
                'La fecha final no puede ser anterior a la inicial',
              );
            return map(
              await tx.activities.update({ where, data: data(input), select }),
            );
          },
          { isolationLevel: 'Serializable' },
        ),
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      )
        throw new RbacError(
          'conflict',
          'La actividad cambió durante la actualización; vuelve a intentar',
        );
      throw error;
    }
  }
  async approve(activityId: string, status: ApproveActivity['status']) {
    return prismaWrite(async () =>
      map(
        await this.prisma.activities.update({
          where: { activity_id: activityId },
          data: { overall_status: status, updated_at: new Date() },
          select,
        }),
      ),
    );
  }
  async delete(activityId: string) {
    await prismaWrite(() =>
      this.prisma.activities.delete({ where: { activity_id: activityId } }),
    );
  }
}
