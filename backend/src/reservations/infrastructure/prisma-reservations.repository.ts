import { Injectable } from '@nestjs/common';
import type {
  CreateReservation,
  Reservation,
  ReservationCreatorOption,
  ReservationList,
  ReservationSpaceOption,
  UpdateReservation,
} from '@shared/contracts';
import { Prisma } from '../../generated/prisma/client.js';
import { RbacError } from '../../common/domain/rbac.error.js';
import { prismaWrite } from '../../common/infrastructure/prisma-error.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ReservationsRepository } from '../domain/reservations.repository.js';

const select = {
  reservation_id: true,
  title: true,
  description: true,
  activity_id: true,
  status: true,
  start_time: true,
  end_time: true,
  created_at: true,
  updated_at: true,
  users: { select: { user_id: true, username: true } },
  reservation_spaces: {
    select: {
      spaces: {
        select: {
          space_id: true,
          name: true,
          description: true,
          capacity: true,
          status: true,
        },
      },
    },
  },
} satisfies Prisma.reservationsSelect;

function map(
  row: Prisma.reservationsGetPayload<{ select: typeof select }>,
): Reservation {
  return {
    reservationId: row.reservation_id,
    title: row.title,
    description: row.description,
    activityId: row.activity_id,
    status: row.status,
    startTime: row.start_time?.toISOString() ?? null,
    endTime: row.end_time?.toISOString() ?? null,
    creator: { userId: row.users.user_id, username: row.users.username },
    spaces: row.reservation_spaces.map(({ spaces }) => ({
      spaceId: spaces.space_id,
      name: spaces.name,
      description: spaces.description,
      capacity: spaces.capacity,
      status: spaces.status,
    })),
    createdAt: row.created_at?.toISOString() ?? null,
    updatedAt: row.updated_at?.toISOString() ?? null,
  };
}

function date(value: string | undefined) {
  return value === undefined ? undefined : new Date(value);
}

async function ensureSpacesAvailable(
  tx: Prisma.TransactionClient,
  spaceIds: string[],
  startTime: Date,
  endTime: Date,
  excludeReservationId?: string,
) {
  if (spaceIds.length === 0) return;

  const conflict = await tx.reservations.findFirst({
    where: {
      ...(excludeReservationId
        ? { reservation_id: { not: excludeReservationId } }
        : {}),
      status: { in: ['pending', 'reserved', 'active', 'in_use'] },
      start_time: { lt: endTime },
      end_time: { gt: startTime },
      reservation_spaces: {
        some: { space_id: { in: spaceIds } },
      },
    },
    select: {
      title: true,
      reservation_spaces: {
        where: { space_id: { in: spaceIds } },
        select: { spaces: { select: { name: true } } },
      },
    },
  });

  if (conflict) {
    const spaceName = conflict.reservation_spaces[0]?.spaces.name;
    throw new RbacError(
      'conflict',
      spaceName
        ? `El espacio “${spaceName}” ya tiene una reservación en ese horario`
        : 'Uno de los espacios ya tiene una reservación en ese horario',
    );
  }
}

function throwSerializableConflict(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2034'
  ) {
    throw new RbacError(
      'conflict',
      'La disponibilidad cambió al mismo tiempo; actualiza y vuelve a intentar',
    );
  }
  throw error;
}

@Injectable()
export class PrismaReservationsRepository implements ReservationsRepository {
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
    return rows.map(({ slug }) => slug);
  }

  async creators(): Promise<ReservationCreatorOption[]> {
    const users = await this.prisma.users.findMany({
      where: { user_statuses: { name: 'ACTIVE' } },
      select: { user_id: true, username: true, email: true },
      orderBy: [{ username: 'asc' }, { email: 'asc' }],
    });
    return users.map((user) => ({
      userId: user.user_id,
      username: user.username,
      email: user.email,
    }));
  }

  async spaces(): Promise<ReservationSpaceOption[]> {
    const rows = await this.prisma.spaces.findMany({
      where: { status: 'active' },
      select: {
        space_id: true,
        name: true,
        description: true,
        capacity: true,
        status: true,
      },
      orderBy: [{ name: 'asc' }, { space_id: 'asc' }],
    });
    return rows.map((space) => ({
      spaceId: space.space_id,
      name: space.name,
      description: space.description,
      capacity: space.capacity,
      status: space.status,
    }));
  }

  async list(
    query: ReservationList,
    creatorId?: string,
    assignedActivityUserId?: string,
  ) {
    const scope: Prisma.reservationsWhereInput =
      creatorId && assignedActivityUserId
        ? {
            OR: [
              { creator_id: creatorId },
              {
                activities: {
                  activity_personnel: {
                    some: { user_id: assignedActivityUserId },
                  },
                },
              },
            ],
          }
        : creatorId
          ? { creator_id: creatorId }
          : assignedActivityUserId
            ? {
                activities: {
                  activity_personnel: {
                    some: { user_id: assignedActivityUserId },
                  },
                },
              }
            : {};
    const where: Prisma.reservationsWhereInput = { ...scope };
    if (query.includeInactive !== 'true') {
      where.status = { notIn: ['inactive', 'cancelled'] };
    }
    if (query.endTime) where.start_time = { lt: new Date(query.endTime) };
    if (query.startTime) where.end_time = { gt: new Date(query.startTime) };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.reservations.findMany({
        where,
        select,
        orderBy: [{ created_at: 'desc' }, { reservation_id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.reservations.count({ where }),
    ]);
    return { reservations: rows.map(map), total };
  }

  async find(
    reservationId: string,
    creatorId?: string,
    assignedActivityUserId?: string,
  ) {
    const row = await this.prisma.reservations.findFirst({
      where: {
        reservation_id: reservationId,
        ...(creatorId && assignedActivityUserId
          ? {
              OR: [
                { creator_id: creatorId },
                {
                  activities: {
                    activity_personnel: {
                      some: { user_id: assignedActivityUserId },
                    },
                  },
                },
              ],
            }
          : creatorId
            ? { creator_id: creatorId }
            : assignedActivityUserId
              ? {
                  activities: {
                    activity_personnel: {
                      some: { user_id: assignedActivityUserId },
                    },
                  },
                }
              : {}),
      },
      select,
    });
    return row ? map(row) : null;
  }

  async create(input: CreateReservation & { creatorId: string }) {
    return prismaWrite(async () => {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const spaceIds = [...new Set(input.spaceIds ?? [])];
            const startTime = new Date(input.startTime);
            const endTime = new Date(input.endTime);
            const activeSpaceCount = await tx.spaces.count({
              where: { space_id: { in: spaceIds }, status: 'active' },
            });
            if (activeSpaceCount !== spaceIds.length)
              throw new RbacError(
                'invalid',
                'Todos los espacios deben existir y estar activos',
              );
            await ensureSpacesAvailable(tx, spaceIds, startTime, endTime);
            const linkedActivity = input.activityId
              ? await tx.activities.findUnique({
                  where: { activity_id: input.activityId },
                  select: { overall_status: true },
                })
              : null;
            if (input.activityId && !linkedActivity)
              throw new RbacError(
                'invalid',
                'La actividad relacionada no existe',
              );
            const saved = await tx.reservations.create({
              data: {
                title: input.title,
                description: input.description ?? null,
                activity_id: input.activityId ?? null,
                start_time: startTime,
                end_time: endTime,
                creator_id: input.creatorId,
                status:
                  linkedActivity?.overall_status === 'approved'
                    ? 'reserved'
                    : linkedActivity
                      ? 'pending'
                      : 'active',
              },
              select,
            });
            if (spaceIds.length) {
              await tx.reservation_spaces.createMany({
                data: spaceIds.map((space_id) => ({
                  reservation_id: saved.reservation_id,
                  space_id,
                })),
              });
            }
            if (input.activityId) {
              const recipients = await tx.activity_personnel.findMany({
                where: { activity_id: input.activityId },
                select: { user_id: true },
              });
              if (recipients.length) {
                await tx.notifications.createMany({
                  data: [
                    ...new Set(recipients.map(({ user_id }) => user_id)),
                  ].map((user_id) => ({
                    user_id,
                    activity_id: input.activityId,
                    reservation_id: saved.reservation_id,
                    title: 'Se solicitó un servicio para una actividad',
                    message:
                      'Se registró una reservación vinculada a una actividad en la que colaboras.',
                    type: 'reservation_service_request',
                  })),
                });
              }
            }
            // Return the reservation after its space relations have been persisted so
            // the POST response matches the representation returned by subsequent GETs.
            return map(
              await tx.reservations.findUniqueOrThrow({
                where: { reservation_id: saved.reservation_id },
                select,
              }),
            );
          },
          { isolationLevel: 'Serializable' },
        );
      } catch (error) {
        throwSerializableConflict(error);
      }
    });
  }

  async update(
    reservationId: string,
    input: UpdateReservation,
    creatorId?: string,
  ) {
    return prismaWrite(async () => {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const where = {
              reservation_id: reservationId,
              ...(creatorId ? { creator_id: creatorId } : {}),
            };
            const existing = await tx.reservations.findFirst({ where, select });
            if (!existing)
              throw new RbacError('not_found', 'Reservación no encontrada');

            const start = date(input.startTime) ?? existing.start_time;
            const end = date(input.endTime) ?? existing.end_time;
            if (start && end && end <= start)
              throw new RbacError(
                'invalid',
                'La fecha final debe ser posterior a la inicial',
              );

            const nextSpaceIds =
              input.spaceIds ??
              existing.reservation_spaces.map(({ spaces }) => spaces.space_id);
            const nextStatus = input.status ?? existing.status;
            if (
              start &&
              end &&
              nextStatus &&
              ['pending', 'reserved', 'active', 'in_use'].includes(nextStatus)
            ) {
              await ensureSpacesAvailable(
                tx,
                nextSpaceIds,
                start,
                end,
                reservationId,
              );
            }

            if (input.spaceIds !== undefined) {
              const spaceIds = [...new Set(input.spaceIds)];
              const activeSpaceCount = await tx.spaces.count({
                where: { space_id: { in: spaceIds }, status: 'active' },
              });
              if (activeSpaceCount !== spaceIds.length)
                throw new RbacError(
                  'invalid',
                  'Todos los espacios deben existir y estar activos',
                );
              await tx.reservation_spaces.deleteMany({
                where: { reservation_id: reservationId },
              });
              if (spaceIds.length) {
                await tx.reservation_spaces.createMany({
                  data: spaceIds.map((space_id) => ({
                    reservation_id: reservationId,
                    space_id,
                  })),
                });
              }
            }

            return map(
              await tx.reservations.update({
                where: { reservation_id: reservationId },
                data: {
                  title: input.title,
                  description: input.description,
                  activity_id: input.activityId,
                  status: input.status,
                  start_time: date(input.startTime),
                  end_time: date(input.endTime),
                  updated_at: new Date(),
                },
                select,
              }),
            );
          },
          { isolationLevel: 'Serializable' },
        );
      } catch (error) {
        throwSerializableConflict(error);
      }
    });
  }

  async delete(reservationId: string, creatorId?: string) {
    return prismaWrite(() =>
      this.prisma.$transaction(async (tx) => {
        const where = {
          reservation_id: reservationId,
          ...(creatorId ? { creator_id: creatorId } : {}),
        };
        const existing = await tx.reservations.findFirst({
          where,
          select: { reservation_id: true },
        });
        if (!existing)
          throw new RbacError('not_found', 'Reservación no encontrada');

        const reservationWhere = { reservation_id: reservationId };
        await tx.reservation_spaces.deleteMany({ where: reservationWhere });
        await tx.reservation_resources.deleteMany({ where: reservationWhere });
        await tx.reservation_personnel.deleteMany({ where: reservationWhere });
        await tx.reservations.delete({
          where: { reservation_id: reservationId },
        });
      }),
    );
  }
}
