import { Injectable } from '@nestjs/common';
import type { Axis, CreateAxis, CreateObjective, Objective, UpdateAxis, UpdateObjective } from '@shared/contracts';
import { Prisma } from '../../generated/prisma/client.js';
import { prismaWrite } from '../../common/infrastructure/prisma-error.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PlanningRepository } from '../domain/planning.repository.js';

const axisSelect = { axis_id: true, name: true, description: true, created_at: true, updated_at: true } satisfies Prisma.axisSelect;
const objectiveSelect = {
  objective_id: true, name: true, description: true, axis_id: true,
  created_at: true, updated_at: true,
  axis: { select: { name: true } },
} satisfies Prisma.objectivesSelect;
const mapAxis = (row: Prisma.axisGetPayload<{ select: typeof axisSelect }>): Axis => ({
  axisId: row.axis_id, name: row.name, description: row.description,
  createdAt: row.created_at?.toISOString() ?? null, updatedAt: row.updated_at?.toISOString() ?? null,
});
const mapObjective = (row: Prisma.objectivesGetPayload<{ select: typeof objectiveSelect }>): Objective => ({
  objectiveId: row.objective_id, name: row.name, description: row.description,
  axisId: row.axis_id, axisName: row.axis?.name ?? null,
  createdAt: row.created_at?.toISOString() ?? null, updatedAt: row.updated_at?.toISOString() ?? null,
});

@Injectable()
export class PrismaPlanningRepository extends PlanningRepository {
  constructor(private readonly prisma: PrismaService) { super(); }
  async permissions(userId: string) {
    const rows = await this.prisma.permissions.findMany({
      where: { role_permissions: { some: { roles: { user_roles: { some: { user_id: userId } } } } } },
      select: { slug: true },
    });
    return rows.map(({ slug }) => slug);
  }
  async axes() {
    return (await this.prisma.axis.findMany({ select: axisSelect, orderBy: [{ name: 'asc' }, { axis_id: 'asc' }] })).map(mapAxis);
  }
  async createAxis(input: CreateAxis) {
    return prismaWrite(async () => mapAxis(await this.prisma.axis.create({
      data: { name: input.name, description: input.description ?? null }, select: axisSelect,
    })));
  }
  async updateAxis(axisId: string, input: UpdateAxis) {
    return prismaWrite(async () => mapAxis(await this.prisma.axis.update({
      where: { axis_id: axisId }, data: { ...input, updated_at: new Date() }, select: axisSelect,
    })));
  }
  async objectives() {
    return (await this.prisma.objectives.findMany({ select: objectiveSelect, orderBy: [{ name: 'asc' }, { objective_id: 'asc' }] })).map(mapObjective);
  }
  async createObjective(input: CreateObjective) {
    return prismaWrite(async () => mapObjective(await this.prisma.objectives.create({
      data: { name: input.name, description: input.description ?? null, axis_id: input.axisId ?? null }, select: objectiveSelect,
    })));
  }
  async updateObjective(objectiveId: string, input: UpdateObjective) {
    return prismaWrite(async () => mapObjective(await this.prisma.objectives.update({
      where: { objective_id: objectiveId }, data: { ...input, updated_at: new Date() }, select: objectiveSelect,
    })));
  }
}
