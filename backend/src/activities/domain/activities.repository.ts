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

export abstract class ActivitiesRepository {
  abstract permissions(userId: string): Promise<string[]>;
  abstract list(
    query: ActivityList,
    creatorId?: string,
    assignedUserId?: string,
  ): Promise<{ activities: Activity[]; total: number }>;
  abstract find(
    activityId: string,
    creatorId?: string,
    assignedUserId?: string,
  ): Promise<Activity | null>;
  abstract creators(
    query: ActivityList,
  ): Promise<{
    users: { userId: string; username: string | null }[];
    total: number;
  }>;
  abstract activeCreator(userId: string): Promise<boolean>;
  abstract report(activityId: string): Promise<ActivityReport | null>;
  abstract externalLocations(activityId: string): Promise<ExternalLocation[]>;
  abstract attachExternalLocations(
    activityId: string,
    locations: ExternalLocationInput[],
  ): Promise<ExternalLocation[]>;
  abstract removeExternalLocation(
    activityId: string,
    locationId: string,
  ): Promise<void>;
  abstract activityPersonnel(activityId: string): Promise<ActivityPersonnelMember[]>;
  abstract setActivityPersonnel(
    activityId: string,
    input: ActivityPersonnelInput,
  ): Promise<ActivityPersonnelMember[]>;
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
    direction: ActivityApprovalDirection,
    status: ApproveActivity['status'],
  ): Promise<Activity>;
  abstract delete(activityId: string): Promise<void>;
}
