import { z } from "zod";

export const RESERVATION_PERMISSIONS = {
  manage: "reservation:manage",
  viewAll: "reservation:view_all",
  createOwn: "reservation:create_own",
  viewOwn: "reservation:view_own",
  updateOwn: "reservation:update_own",
  deleteOwn: "reservation:delete_own",
  viewAssigned: "reservation:view_assigned",
} as const;

const timestamp = z.iso.datetime({ offset: true });
const reservationStatus = z.enum([
  "pending",
  "reserved",
  "active",
  "in_use",
  "inactive",
  "cancelled",
  "completed",
]);
const reservationFields = {
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(10000).nullable(),
  activityId: z.uuid().nullable(),
  startTime: timestamp,
  endTime: timestamp,
  status: reservationStatus,
};
const spaceIds = z
  .array(z.uuid())
  .max(20)
  .refine((ids) => new Set(ids).size === ids.length, "No repitas espacios");
const validWindow = (value: { startTime?: string; endTime?: string }) =>
  !value.startTime ||
  !value.endTime ||
  Date.parse(value.endTime) > Date.parse(value.startTime);

export const createReservationSchema = z
  .strictObject({
    title: reservationFields.title,
    description: reservationFields.description.optional(),
    activityId: reservationFields.activityId.optional(),
    creatorId: z.uuid().optional(),
    spaceIds: spaceIds.optional(),
    startTime: reservationFields.startTime,
    endTime: reservationFields.endTime,
  })
  .refine(validWindow, "La fecha final debe ser posterior a la inicial");

export const putReservationSchema = z
  .strictObject({ ...reservationFields, spaceIds: spaceIds.optional() })
  .refine(validWindow, "La fecha final debe ser posterior a la inicial");

export const patchReservationSchema = z
  .strictObject({ ...reservationFields, spaceIds: spaceIds.optional() })
  .partial()
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    "Envía al menos un campo",
  )
  .refine(validWindow, "La fecha final debe ser posterior a la inicial");

export const reservationListSchema = z
  .strictObject({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    startTime: timestamp.optional(),
    endTime: timestamp.optional(),
    includeInactive: z.enum(["true", "false"]).optional(),
  })
  .refine(
    ({ startTime, endTime }) =>
      !startTime || !endTime || Date.parse(endTime) > Date.parse(startTime),
    "El fin del rango debe ser posterior al inicio",
  );

export type CreateReservation = z.infer<typeof createReservationSchema>;
export type PutReservation = z.infer<typeof putReservationSchema>;
export type PatchReservation = z.infer<typeof patchReservationSchema>;
export type UpdateReservation = PutReservation | PatchReservation;
export type ReservationList = z.infer<typeof reservationListSchema>;
export type ReservationStatus = z.infer<typeof reservationStatus>;

export interface Reservation {
  reservationId: string;
  title: string | null;
  description: string | null;
  activityId: string | null;
  status: ReservationStatus | null;
  startTime: string | null;
  endTime: string | null;
  creator: { userId: string; username: string | null };
  spaces: ReservedSpace[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ReservedSpace {
  spaceId: string;
  name: string | null;
  description: string | null;
  capacity: number | null;
  status: "active" | "inactive" | "undermaintenance";
}

export type ReservationSpaceOption = ReservedSpace;

export interface ReservationActions {
  canView: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface ReservationCreatorOption {
  userId: string;
  username: string | null;
  email: string;
}
