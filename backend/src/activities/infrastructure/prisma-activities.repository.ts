import { Injectable } from '@nestjs/common';
import type {
  Activity,
  ActivityList,
  ActivityReport,
  ActivityPersonnelInput,
  ActivityPersonnelMember,
  ExternalLocation,
  ExternalLocationInput,
  ApproveActivity,
  ActivityApprovalDirection,
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
  planning_approved: true,
  academic_approved: true,
  admin_approved: true,
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
    approvals: {
      planning: row.planning_approved,
      academic: row.academic_approved,
      administrative: row.admin_approved,
    },
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
  async list(query: ActivityList, creatorId?: string, assignedUserId?: string) {
    const where: Prisma.activitiesWhereInput = {};
    if (creatorId && assignedUserId) {
      where.OR = [
        { creator_id: creatorId },
        { activity_personnel: { some: { user_id: assignedUserId } } },
      ];
    } else if (creatorId) {
      where.creator_id = creatorId;
    } else if (assignedUserId) {
      where.activity_personnel = { some: { user_id: assignedUserId } };
    }
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
  async find(activityId: string, creatorId?: string, assignedUserId?: string) {
    const row = await this.prisma.activities.findFirst({
      where: {
        activity_id: activityId,
        ...(creatorId && assignedUserId
          ? { OR: [{ creator_id: creatorId }, { activity_personnel: { some: { user_id: assignedUserId } } }] }
          : creatorId
            ? { creator_id: creatorId }
            : assignedUserId
              ? { activity_personnel: { some: { user_id: assignedUserId } } }
              : {}),
      },
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
  async report(activityId: string): Promise<ActivityReport | null> {
    const report = await this.prisma.activity_reports.findUnique({
      where: { activity_id: activityId },
      select: {
        report_id: true,
        activity_id: true,
        folio: true,
        report_date: true,
        results_summary: true,
        created_at: true,
        updated_at: true,
      },
    });
    if (!report) return null;
    return {
      reportId: report.report_id,
      activityId: report.activity_id,
      folio: report.folio,
      reportDate: report.report_date.toISOString().slice(0, 10),
      resultsSummary: report.results_summary,
      createdAt: report.created_at?.toISOString() ?? null,
      updatedAt: report.updated_at?.toISOString() ?? null,
    };
  }
  async externalLocations(activityId: string): Promise<ExternalLocation[]> {
    const rows = await this.prisma.activity_external_locations.findMany({
      where: { activity_id: activityId },
      select: { locations: true },
      orderBy: { created_at: 'asc' },
    });
    return rows.map(({ locations }) => ({
      locationId: locations.location_id,
      googlePlaceId: locations.google_place_id,
      name: locations.name,
      formattedAddress: locations.formatted_address,
      latitude: Number(locations.latitude),
      longitude: Number(locations.longitude),
    }));
  }
  async attachExternalLocations(
    activityId: string,
    locations: ExternalLocationInput[],
  ): Promise<ExternalLocation[]> {
    await this.prisma.$transaction(async (tx) => {
      for (const location of locations) {
        const saved = await tx.external_locations.upsert({
          where: { google_place_id: location.googlePlaceId },
          create: {
            google_place_id: location.googlePlaceId,
            name: location.name,
            formatted_address: location.formattedAddress ?? null,
            latitude: location.latitude,
            longitude: location.longitude,
          },
          update: {
            name: location.name,
            formatted_address: location.formattedAddress ?? null,
            latitude: location.latitude,
            longitude: location.longitude,
            updated_at: new Date(),
          },
          select: { location_id: true },
        });
        await tx.activity_external_locations.createMany({
          data: [{ activity_id: activityId, location_id: saved.location_id }],
          skipDuplicates: true,
        });
      }
    });
    return this.externalLocations(activityId);
  }
  async removeExternalLocation(activityId: string, locationId: string) {
    const result = await this.prisma.activity_external_locations.deleteMany({
      where: { activity_id: activityId, location_id: locationId },
    });
    if (result.count === 0)
      throw new RbacError('not_found', 'Ubicación no encontrada para la actividad');
  }
  async activityPersonnel(activityId: string): Promise<ActivityPersonnelMember[]> {
    const rows = await this.prisma.activity_personnel.findMany({
      where: { activity_id: activityId },
      select: { users: { select: { user_id: true, username: true, email: true } } },
      orderBy: { users: { username: 'asc' } },
    });
    return rows.map(({ users }) => ({
      userId: users.user_id,
      username: users.username,
      email: users.email,
    }));
  }
  async setActivityPersonnel(
    activityId: string,
    input: ActivityPersonnelInput,
  ): Promise<ActivityPersonnelMember[]> {
    await prismaWrite(() => this.prisma.$transaction(async (tx) => {
      const uniqueIds = [...new Set(input.userIds)];
      const activeUsers = await tx.users.count({
        where: { user_id: { in: uniqueIds }, user_statuses: { name: 'ACTIVE' } },
      });
      if (activeUsers !== uniqueIds.length)
        throw new RbacError('invalid', 'Todos los colaboradores deben ser usuarios activos existentes');
      await tx.activity_personnel.deleteMany({ where: { activity_id: activityId } });
      if (uniqueIds.length) {
        await tx.activity_personnel.createMany({
          data: uniqueIds.map((user_id) => ({ activity_id: activityId, user_id })),
        });
        await tx.notifications.createMany({
          data: uniqueIds.map((user_id) => ({
            user_id,
            activity_id: activityId,
            title: 'Se requiere tu servicio',
            message: 'Se te asignó como colaborador de una actividad. Revisa sus detalles y fechas.',
            type: 'activity_service_request',
          })),
        });
      }
    }));
    return this.activityPersonnel(activityId);
  }
  async create(input: CreateActivity & { creatorId: string }) {
    return prismaWrite(() => this.prisma.$transaction(async (tx) => {
      const activity = await tx.activities.create({
        data: { ...data(input), creator_id: input.creatorId },
        select,
      });
      for (const location of input.externalLocations ?? []) {
        const saved = await tx.external_locations.upsert({
          where: { google_place_id: location.googlePlaceId },
          create: {
            google_place_id: location.googlePlaceId,
            name: location.name,
            formatted_address: location.formattedAddress ?? null,
            latitude: location.latitude,
            longitude: location.longitude,
          },
          update: {
            name: location.name,
            formatted_address: location.formattedAddress ?? null,
            latitude: location.latitude,
            longitude: location.longitude,
            updated_at: new Date(),
          },
          select: { location_id: true },
        });
        await tx.activity_external_locations.create({
          data: { activity_id: activity.activity_id, location_id: saved.location_id },
        });
      }
      return map(activity);
    }));
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
              await tx.activities.update({
                where,
                data: {
                  ...data(input),
                  ...(input.creatorId === undefined
                    ? {}
                    : { creator_id: input.creatorId }),
                },
                select,
              }),
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
  async approve(
    activityId: string,
    direction: ActivityApprovalDirection,
    status: ApproveActivity['status'],
  ) {
    return prismaWrite(() => this.prisma.$transaction(async (tx) => {
      const current = await tx.activities.findUnique({
        where: { activity_id: activityId },
        select: {
          activity_id: true,
          title: true,
          start_date: true,
          creator_id: true,
          planning_approved: true,
          academic_approved: true,
          admin_approved: true,
        },
      });
      if (!current) throw new RbacError('not_found', 'Actividad no encontrada');
      const approvalField = {
        planning: 'planning_approved',
        academic: 'academic_approved',
        administrative: 'admin_approved',
      } as const;
      const approvals = {
        planning: current.planning_approved,
        academic: current.academic_approved,
        administrative: current.admin_approved,
        [direction]: status,
      };
      const values = Object.values(approvals);
      const overall = values.includes('cancelled')
        ? 'cancelled'
        : values.includes('rejected')
          ? 'rejected'
          : values.includes('rescheduled')
            ? 'rescheduled'
            : values.every((value) => value === 'approved')
              ? 'approved'
              : 'pending';
      const activity = await tx.activities.update({
        where: { activity_id: activityId },
        data: {
          [approvalField[direction]]: status,
          overall_status: overall,
          updated_at: new Date(),
        },
        select,
      });
      await tx.reservations.updateMany({
        where: { activity_id: activityId },
        data: {
          status: overall === 'approved'
            ? 'reserved'
            : overall === 'cancelled' || overall === 'rejected'
              ? 'cancelled'
              : 'pending',
          updated_at: new Date(),
        },
      });
      if (overall === 'approved') {
        const year = current.start_date?.getUTCFullYear() ?? new Date().getUTCFullYear();
        await tx.activity_reports.upsert({
          where: { activity_id: activityId },
          create: {
            activity_id: activityId,
            folio: `PL-${year}-${activityId.slice(0, 8).toUpperCase()}`,
            results_summary: `Reporte de planeación generado automáticamente para la actividad “${current.title ?? 'Sin título'}” después de completar las aprobaciones institucionales.`,
          },
          update: { updated_at: new Date() },
        });
      }
      const recipients = await tx.activity_personnel.findMany({
        where: { activity_id: activityId },
        select: { user_id: true },
      });
      const recipientIds = [...new Set([current.creator_id, ...recipients.map(({ user_id }) => user_id)])];
      await tx.notifications.createMany({
        data: recipientIds.map((user_id) => ({
          user_id,
          activity_id: activityId,
          title: 'Actualización de aprobación de actividad',
          message: `La aprobación de ${direction} cambió a ${status}. Estado general: ${overall}.`,
          type: 'activity_approval',
        })),
      });
      return map(activity);
    }));
  }
  async delete(activityId: string) {
    await prismaWrite(() =>
      this.prisma.activities.delete({ where: { activity_id: activityId } }),
    );
  }
}
