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
      canUpdateAll: policy.canUpdateAll,
      canUpdateOwn: policy.canUpdateAll || policy.has(P.updateOwn),
      canApprove: policy.canApprove,
      canDelete: policy.manages,
      approvalOptions: policy.canApprove ? ACTIVITY_APPROVAL_OPTIONS : [],
    };
  }
  async creators(userId: string, query: ActivityList) {
    this.require((await this.policy(userId)).manages);
    return { ...(await this.repository.creators(query)), ...query };
  }
  async list(userId: string, query: ActivityList) {
    const policy = await this.policy(userId);
    this.require(policy.canViewAll || policy.canViewOwn);
    const result = await this.repository.list(
      query,
      policy.canViewAll ? undefined : userId,
    );
    return {
      ...result,
      activities: result.activities.map((a) => this.present(a, policy)),
      ...query,
    };
  }
  async get(userId: string, activityId: string) {
    const policy = await this.policy(userId);
    this.require(policy.canViewAll || policy.canViewOwn);
    const activity = await this.repository.find(
      activityId,
      policy.canViewAll ? undefined : userId,
    );
    if (!activity) throw new NotFoundException('Actividad no encontrada');
    return this.present(activity, policy);
  }
  async create(userId: string, input: CreateActivity) {
    const policy = await this.policy(userId);
    this.require(policy.canCreate);
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
    return this.present(
      await this.repository.approve(activityId, input.status),
      policy,
    );
  }
  async delete(userId: string, activityId: string) {
    this.require((await this.policy(userId)).manages);
    await this.repository.delete(activityId);
  }
}
