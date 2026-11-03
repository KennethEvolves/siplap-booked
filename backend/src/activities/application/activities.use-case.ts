import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ACTIVITY_APPROVAL_OPTIONS,
  ACTIVITY_PERMISSIONS as P,
  type Activity,
  type ActivityList,
  type ActivityReport,
  type ActivityPersonnelInput,
  type AttachExternalLocations,
  type ApproveActivity,
  type CreateActivity,
  type UpdateActivity,
} from '@shared/contracts';
import { ActivitiesRepository } from '../domain/activities.repository.js';
import { ActivityPolicy } from '../domain/activity-policy.js';

export class ActivitiesUseCase {
  constructor(private readonly repository: ActivitiesRepository) {}
  private async policy(userId: string) {
    return new ActivityPolicy(
      userId,
      await this.repository.permissions(userId),
    );
  }
  private require(allowed: boolean) {
    if (!allowed)
      throw new ForbiddenException(
        'No tienes permiso para realizar esta operación',
      );
  }
  private present(activity: Activity, policy: ActivityPolicy) {
    return { ...activity, actions: policy.actions(activity.creator.userId) };
  }
  async capabilities(userId: string) {
    const policy = await this.policy(userId);
    return {
      canCreate: policy.canCreate,
      canAssignCreator: policy.manages,
      canViewAll: policy.canViewAll,
      canViewOwn: policy.canViewAll || policy.canViewOwn,
      canViewAssigned: policy.canViewAssigned,
      canUpdateAll: policy.canUpdateAll,
      canUpdateOwn: policy.canUpdateAll || policy.has(P.updateOwn),
      canApprove: policy.canApprove,
      canDelete: policy.manages,
      approvalOptions: policy.approvalOptions, // <-- Ahora devuelve sus opciones reales calculadas
    };
  }
  async creators(userId: string, query: ActivityList) {
    this.require((await this.policy(userId)).manages);
    return { ...(await this.repository.creators(query)), ...query };
  }
  async list(userId: string, query: ActivityList) {
    const policy = await this.policy(userId);
    this.require(
      policy.canViewAll || policy.canViewOwn || policy.canViewAssigned,
    );
    const creatorId =
      policy.canViewAll || !policy.canViewOwn ? undefined : userId;
    const assignedUserId =
      policy.canViewAll || !policy.canViewAssigned ? undefined : userId;
    const result = assignedUserId
      ? await this.repository.list(query, creatorId, assignedUserId)
      : await this.repository.list(query, creatorId);
    return {
      ...result,
      activities: result.activities.map((a) => this.present(a, policy)),
      ...query,
    };
  }
  async get(userId: string, activityId: string) {
    const policy = await this.policy(userId);
    this.require(
      policy.canViewAll || policy.canViewOwn || policy.canViewAssigned,
    );
    const activity = await this.repository.find(
      activityId,
      policy.canViewAll || !policy.canViewOwn ? undefined : userId,
      policy.canViewAll || !policy.canViewAssigned ? undefined : userId,
    );
    if (!activity) throw new NotFoundException('Actividad no encontrada');
    return this.present(activity, policy);
  }
  async report(userId: string, activityId: string): Promise<ActivityReport> {
    const policy = await this.policy(userId);
    this.require(
      policy.canViewAll || policy.canViewOwn || policy.canViewAssigned,
    );
    const activity = await this.repository.find(
      activityId,
      policy.canViewAll || !policy.canViewOwn ? undefined : userId,
      policy.canViewAll || !policy.canViewAssigned ? undefined : userId,
    );
    if (!activity) throw new NotFoundException('Actividad no encontrada');
    const report = await this.repository.report(activityId);
    if (!report)
      throw new NotFoundException(
        'El reporte de planeación aún no está generado',
      );
    return report;
  }
  async create(userId: string, input: CreateActivity) {
    const policy = await this.policy(userId);
    this.require(policy.canCreate);
    if (policy.manages) {
      this.require(!!input.creatorId && input.creatorId !== userId);
    }
    this.require(
      !input.creatorId || input.creatorId === userId || policy.manages,
    );
    const creatorId = input.creatorId ?? userId;
    if (!(await this.repository.activeCreator(creatorId)))
      throw new BadRequestException(
        'El creador debe ser un usuario activo existente',
      );
    return this.present(
      await this.repository.create({ ...input, creatorId }),
      policy,
    );
  }
  async update(userId: string, activityId: string, input: UpdateActivity) {
    const policy = await this.policy(userId);
    this.require(policy.canUpdateAll || policy.has(P.updateOwn));
    if (input.creatorId !== undefined) {
      this.require(policy.manages);
      const current = await this.repository.find(activityId);
      if (!current) throw new NotFoundException('Actividad no encontrada');
      if (
        input.creatorId !== current.creator.userId &&
        !(await this.repository.activeCreator(input.creatorId))
      )
        throw new BadRequestException(
          'El responsable debe ser un usuario activo existente',
        );
    }
    return this.present(
      await this.repository.update(
        activityId,
        input,
        policy.canUpdateAll ? undefined : userId,
      ),
      policy,
    );
  }
async approve(userId: string, activityId: string, input: ApproveActivity) {
    const policy = await this.policy(userId);
    
    this.require(policy.canApprove);

    this.require(policy.canApproveDirection(input.direction as any));

    return this.present(
      await this.repository.approve(activityId, input),
      policy,
    );
  }
  async delete(userId: string, activityId: string) {
    this.require((await this.policy(userId)).manages);
    await this.repository.delete(activityId);
  }

  async externalLocations(userId: string, activityId: string) {
    const policy = await this.policy(userId);
    this.require(
      policy.canViewAll || policy.canViewOwn || policy.canViewAssigned,
    );
    const activity = await this.repository.find(
      activityId,
      policy.canViewAll || !policy.canViewOwn ? undefined : userId,
      policy.canViewAll || !policy.canViewAssigned ? undefined : userId,
    );
    if (!activity) throw new NotFoundException('Actividad no encontrada');
    return { locations: await this.repository.externalLocations(activityId) };
  }

  async attachExternalLocations(
    userId: string,
    activityId: string,
    input: AttachExternalLocations,
  ) {
    const policy = await this.policy(userId);
    this.require(policy.canUpdateAll || policy.has(P.updateOwn));
    const activity = await this.repository.find(activityId);
    if (!activity) throw new NotFoundException('Actividad no encontrada');
    const own = activity.creator.userId === userId;
    this.require(policy.canUpdateAll || (own && policy.has(P.updateOwn)));
    return {
      locations: await this.repository.attachExternalLocations(
        activityId,
        input.locations,
      ),
    };
  }

  async removeExternalLocation(
    userId: string,
    activityId: string,
    locationId: string,
  ) {
    const policy = await this.policy(userId);
    this.require(policy.canUpdateAll || policy.has(P.updateOwn));
    const activity = await this.repository.find(activityId);
    if (!activity) throw new NotFoundException('Actividad no encontrada');
    const own = activity.creator.userId === userId;
    this.require(policy.canUpdateAll || (own && policy.has(P.updateOwn)));
    await this.repository.removeExternalLocation(activityId, locationId);
  }

  async activityPersonnel(userId: string, activityId: string) {
    const policy = await this.policy(userId);
    this.require(
      policy.canViewAll || policy.canViewOwn || policy.canViewAssigned,
    );
    const activity = await this.repository.find(
      activityId,
      policy.canViewAll || !policy.canViewOwn ? undefined : userId,
      policy.canViewAll || !policy.canViewAssigned ? undefined : userId,
    );
    if (!activity) throw new NotFoundException('Actividad no encontrada');
    return { users: await this.repository.activityPersonnel(activityId) };
  }

  async setActivityPersonnel(
    userId: string,
    activityId: string,
    input: ActivityPersonnelInput,
  ) {
    const policy = await this.policy(userId);
    this.require(policy.canUpdateAll || policy.has(P.updateOwn));
    const activity = await this.repository.find(activityId);
    if (!activity) throw new NotFoundException('Actividad no encontrada');
    const own = activity.creator.userId === userId;
    this.require(policy.canUpdateAll || (own && policy.has(P.updateOwn)));
    return {
      users: await this.repository.setActivityPersonnel(activityId, input),
    };
  }
}
