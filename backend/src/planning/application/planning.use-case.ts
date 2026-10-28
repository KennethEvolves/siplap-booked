import { ForbiddenException } from '@nestjs/common';
import type { CreateAxis, CreateObjective, UpdateAxis, UpdateObjective } from '@shared/contracts';
import { PlanningRepository } from '../domain/planning.repository.js';

export class PlanningUseCase {
  constructor(private readonly repository: PlanningRepository) {}

  private async require(userId: string, permission: string) {
    const permissions = await this.repository.permissions(userId);
    if (!permissions.includes('manage:all') && !permissions.includes(permission))
      throw new ForbiddenException('No tienes permiso para realizar esta operación');
  }

  async axes(userId: string) {
    await this.require(userId, 'axes:read');
    return { axes: await this.repository.axes() };
  }
  async createAxis(userId: string, input: CreateAxis) {
    await this.require(userId, 'axes:create');
    return { axis: await this.repository.createAxis(input) };
  }
  async updateAxis(userId: string, axisId: string, input: UpdateAxis) {
    await this.require(userId, 'axes:update');
    return { axis: await this.repository.updateAxis(axisId, input) };
  }
  async objectives(userId: string) {
    const permissions = await this.repository.permissions(userId);
    if (!permissions.includes('manage:all') && !permissions.includes('objectives:read'))
      throw new ForbiddenException('No tienes permiso para realizar esta operación');
    return { objectives: await this.repository.objectives() };
  }
  async createObjective(userId: string, input: CreateObjective) {
    await this.require(userId, 'objectives:create');
    return { objective: await this.repository.createObjective(input) };
  }
  async updateObjective(userId: string, objectiveId: string, input: UpdateObjective) {
    await this.require(userId, 'objectives:update');
    return { objective: await this.repository.updateObjective(objectiveId, input) };
  }
}
