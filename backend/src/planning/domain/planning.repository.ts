import type { Axis, CreateAxis, CreateObjective, Objective, UpdateAxis, UpdateObjective } from '@shared/contracts';

export abstract class PlanningRepository {
  abstract permissions(userId: string): Promise<string[]>;
  abstract axes(): Promise<Axis[]>;
  abstract createAxis(input: CreateAxis): Promise<Axis>;
  abstract updateAxis(axisId: string, input: UpdateAxis): Promise<Axis>;
  abstract objectives(): Promise<Objective[]>;
  abstract createObjective(input: CreateObjective): Promise<Objective>;
  abstract updateObjective(objectiveId: string, input: UpdateObjective): Promise<Objective>;
}
