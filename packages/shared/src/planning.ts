import { z } from 'zod';

const description = z.string().trim().max(10000).nullable().optional();
export const createAxisSchema = z.strictObject({
  name: z.string().trim().min(1).max(255),
  description,
});
export const updateAxisSchema = createAxisSchema.partial().refine(
  (value) => Object.values(value).some((field) => field !== undefined),
  'Envía al menos un campo',
);
export const createObjectiveSchema = z.strictObject({
  name: z.string().trim().min(1).max(255),
  description,
  axisId: z.uuid().nullable().optional(),
});
export const updateObjectiveSchema = createObjectiveSchema.partial().refine(
  (value) => Object.values(value).some((field) => field !== undefined),
  'Envía al menos un campo',
);
export type CreateAxis = z.infer<typeof createAxisSchema>;
export type UpdateAxis = z.infer<typeof updateAxisSchema>;
export type CreateObjective = z.infer<typeof createObjectiveSchema>;
export type UpdateObjective = z.infer<typeof updateObjectiveSchema>;
export interface Axis {
  axisId: string;
  name: string | null;
  description: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
export interface Objective {
  objectiveId: string;
  name: string | null;
  description: string | null;
  axisId: string | null;
  axisName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
