import { Injectable } from '@nestjs/common';
import type {
  CreateReservation,
  Reservation,
  ReservationCreatorOption,
  ReservationList,
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
} satisfies Prisma.reservationsSelect;

function map(row: Prisma.reservationsGetPayload<{ select: typeof select }>): Reservation {
  return {
    reservationId: row.reservation_id,
    title: row.title,
    description: row.description,
    activityId: row.activity_id,
    status: row.status,
    startTime: row.start_time?.toISOString() ?? null,
    endTime: row.end_time?.toISOString() ?? null,
    creator: { userId: row.users.user_id, username: row.users.username },
    createdAt: row.created_at?.toISOString() ?? null,
    updatedAt: row.updated_at?.toISOString() ?? null,
  };
}

function date(value: string | undefined) {
  return value === undefined ? undefined : new Date(value);
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

  async list(query: ReservationList, creatorId?: string) {
    const where = creatorId ? { creator_id: creatorId } : {};
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

  async find(reservationId: string, creatorId?: string) {
    const row = await this.prisma.reservations.findFirst({
      where: {
        reservation_id: reservationId,
        ...(creatorId ? { creator_id: creatorId } : {}),
      },
      select,
    });
    return row ? map(row) : null;
  }

  async create(input: CreateReservation & { creatorId: string }) {
    return prismaWrite(async () =>
      map(
        await this.prisma.reservations.create({
          data: {
            title: input.title,
            description: input.description ?? null,
            activity_id: input.activityId ?? null,
            start_time: new Date(input.startTime),
            end_time: new Date(input.endTime),
            creator_id: input.creatorId,
          },
          select,
        }),
      ),
    );
  }

  async update(
    reservationId: string,
    input: UpdateReservation,
    creatorId?: string,
  ) {
    return prismaWrite(() =>
      this.prisma.$transaction(async (tx) => {
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
      }),
    );
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
