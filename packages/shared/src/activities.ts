import { z } from "zod";
<<<<<<< HEAD
=======
import { externalLocationSchema } from './external-locations.js';
>>>>>>> 8f49373e15769d54a405321cea9799e69c2dd2d2

export const ACTIVITY_PERMISSIONS = {
  manage: "activity:manage",
  viewAll: "activity:view_all",
  approveAll: "activity:approve_all",
  updateAll: "activity:update_all",
  createOwn: "activity:create_own",
  viewOwn: "activity:view_own",
  updateOwn: "activity:update_own",
<<<<<<< HEAD
=======
  viewAssigned: "activity:view_assigned",
>>>>>>> 8f49373e15769d54a405321cea9799e69c2dd2d2
} as const;

export const ACTIVITY_APPROVAL_OPTIONS = [
  { value: "approved", label: "Aprobado" },
  { value: "rejected", label: "No aprobado" },
  { value: "cancelled", label: "Cancelado" },
  { value: "rescheduled", label: "Reprogramación" },
] as const;

const date = z.iso.date();
const fields = z.strictObject({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(10000).nullable().optional(),
  type: z.enum(["ordinary", "extraordinary", "entry"]).optional(),
  startDate: date,
  endDate: date,
  generalObservation: z.string().trim().max(10000).nullable().optional(),
  requiresCertified: z.boolean().optional(),
  requiresAuthority: z.boolean().optional(),
  objectiveId: z.uuid().nullable().optional(),
});
const ordered = (data: { startDate?: string; endDate?: string }) =>
  !data.startDate || !data.endDate || data.endDate >= data.startDate;
export const createActivitySchema = fields
<<<<<<< HEAD
  .extend({ creatorId: z.uuid().optional() })
  .refine(ordered, "La fecha final no puede ser anterior a la inicial");
=======
  .extend({
    creatorId: z.uuid().optional(),
    externalLocations: z.array(externalLocationSchema).max(20).optional(),
  })
  .refine(ordered, "La fecha final no puede ser anterior a la inicial")
  .refine(
    (value) => !value.externalLocations || new Set(value.externalLocations.map((location) => location.googlePlaceId)).size === value.externalLocations.length,
    'No repitas ubicaciones en la misma actividad',
  );
>>>>>>> 8f49373e15769d54a405321cea9799e69c2dd2d2
export const updateActivitySchema = fields
  .partial()
  .extend({ creatorId: z.uuid().optional() })
  .refine((data) => Object.keys(data).length > 0, "Envía al menos un campo")
  .refine(ordered, "La fecha final no puede ser anterior a la inicial");
export const approveActivitySchema = z.strictObject({
<<<<<<< HEAD
=======
  direction: z.enum(['planning', 'academic', 'administrative']),
>>>>>>> 8f49373e15769d54a405321cea9799e69c2dd2d2
  status: z.enum(["approved", "rejected", "cancelled", "rescheduled"]),
});
export const activityListSchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
<<<<<<< HEAD
export type CreateActivity = z.infer<typeof createActivitySchema>;
export type UpdateActivity = z.infer<typeof updateActivitySchema>;
export type ApproveActivity = z.infer<typeof approveActivitySchema>;
export type ActivityList = z.infer<typeof activityListSchema>;
=======
export const activityPersonnelSchema = z.strictObject({
  userIds: z.array(z.uuid()).max(100),
});
export type CreateActivity = z.infer<typeof createActivitySchema>;
export type UpdateActivity = z.infer<typeof updateActivitySchema>;
export type ApproveActivity = z.infer<typeof approveActivitySchema>;
export type ActivityApprovalDirection = ApproveActivity['direction'];
export type ActivityApprovalStatus = ApproveActivity['status'] | 'pending';
export type ActivityList = z.infer<typeof activityListSchema>;
export type ActivityPersonnelInput = z.infer<typeof activityPersonnelSchema>;
export interface ActivityPersonnelMember {
  userId: string;
  username: string | null;
  email: string;
}
>>>>>>> 8f49373e15769d54a405321cea9799e69c2dd2d2
export interface Activity {
  activityId: string;
  title: string | null;
  description: string | null;
  type: "ordinary" | "extraordinary" | "entry" | null;
  startDate: string | null;
  endDate: string | null;
  generalObservation: string | null;
  requiresCertified: boolean | null;
  requiresAuthority: boolean | null;
  objectiveId: string | null;
  creator: { userId: string; username: string | null };
  status: "pending" | ApproveActivity["status"];
<<<<<<< HEAD
=======
  approvals: {
    planning: ActivityApprovalStatus;
    academic: ActivityApprovalStatus;
    administrative: ActivityApprovalStatus;
  };
>>>>>>> 8f49373e15769d54a405321cea9799e69c2dd2d2
  createdAt: string | null;
  updatedAt: string | null;
}
export interface ActivityActions {
  canView: boolean;
  canUpdate: boolean;
  canApprove: boolean;
  canDelete: boolean;
}
<<<<<<< HEAD
=======
export interface ActivityReport {
  reportId: string;
  activityId: string;
  folio: string;
  reportDate: string;
  resultsSummary: string;
  createdAt: string | null;
  updatedAt: string | null;
}
>>>>>>> 8f49373e15769d54a405321cea9799e69c2dd2d2
