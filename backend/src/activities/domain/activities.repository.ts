import type {
  Activity,
  ActivityList,
  ApproveActivity,
  CreateActivity,
  UpdateActivity,
} from '@shared/contracts';

export abstract class ActivitiesRepository {
  abstract permissions(userId: string): Promise<string[]>;
  abstract list(
    query: ActivityList,
    creatorId?: string,
  ): Promise<{ activities: Activity[]; total: number }>;
  abstract find(
    activityId: string,
    creatorId?: string,
  ): Promise<Activity | null>;
  abstract creators(
    query: ActivityList,
  ): Promise<{
    users: { userId: string; username: string | null }[];
    total: number;
  }>;
  abstract activeCreator(userId: string): Promise<boolean>;
  abstract create(
    input: CreateActivity & { creatorId: string },
  ): Promise<Activity>;
  abstract update(
    activityId: string,
    input: UpdateActivity,
    creatorId?: string,
  ): Promise<Activity>;
  abstract approve(
    activityId: string,
    status: ApproveActivity['status'],
  ): Promise<Activity>;
  abstract delete(activityId: string): Promise<void>;
}
