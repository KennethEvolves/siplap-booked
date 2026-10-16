import { z } from "zod";

export const ACTIVITY_PERMISSIONS = {
  manage: "activity:manage",
  viewAll: "activity:view_all",
  approveAll: "activity:approve_all",
  updateAll: "activity:update_all",
  createOwn: "activity:create_own",
  viewOwn: "activity:view_own",
  updateOwn: "activity:update_own",
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
  .extend({ creatorId: z.uuid().optional() })
  .refine(ordered, "La fecha final no puede ser anterior a la inicial");
// Creator and approval fields deliberately cannot be changed through the ordinary update.
export const updateActivitySchema = fields
  .extend({ creatorId: z.uuid().optional() })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Envía al menos un campo")
  .refine(ordered, "La fecha final no puede ser anterior a la inicial");
export const approveActivitySchema = z.strictObject({
  status: z.enum(["approved", "rejected", "cancelled", "rescheduled"]),
});
export const activityListSchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type CreateActivity = z.infer<typeof createActivitySchema>;
export type UpdateActivity = z.infer<typeof updateActivitySchema>;
export type ApproveActivity = z.infer<typeof approveActivitySchema>;
export type ActivityList = z.infer<typeof activityListSchema>;
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
  createdAt: string | null;
  updatedAt: string | null;
}
export interface ActivityActions {
  canView: boolean;
  canUpdate: boolean;
  canApprove: boolean;
  canDelete: boolean;
}
