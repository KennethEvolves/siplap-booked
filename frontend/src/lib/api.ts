"use client";

import { getSession, signOut } from "next-auth/react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function removeToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("accessToken");
    document.cookie = "accessToken=; path=/; max-age=0";
  }
}
let pendingSession: ReturnType<typeof getSession> | undefined;
export async function getAccessToken(): Promise<string | null> {
  pendingSession ??= getSession();
  try {
    return (await pendingSession)?.user?.accessToken ?? null;
  } finally {
    pendingSession = undefined;
  }
}
let endingSession: Promise<unknown> | undefined;
async function expireSession() {
  removeToken();
  endingSession ??= signOut({ redirectTo: "/login" });
  await endingSession;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  requiresAuth = true,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (requiresAuth) {
    const token = await getAccessToken();

    if (!token) {
      await expireSession();
      throw new ApiError("Tu sesión terminó. Inicia sesión nuevamente.", 401);
    }
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (requiresAuth && response.status === 401) {
    await expireSession();
    throw new ApiError("Tu sesión terminó. Inicia sesión nuevamente.", 401);
  }
  const text = await response.text();
  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    throw new ApiError(
      typeof data === "object" && data !== null && "message" in data
        ? Array.isArray(data.message)
          ? data.message.join(". ")
          : String(data.message)
        : `Error HTTP ${response.status}`,
      response.status,
    );
  }

  return data as T;
}

export interface UserProfileResponse {
  profile: {
    userId: string;
    username: string | null;
    email: string;
    status: { statusId: string; name: string };
    userType: { typeId: string; name: string | null } | null;
    department: { departmentId: string; name: string } | null;
    roles: Array<{ roleId: string; name: string | null }>;
    firstName: string | null;
    lastName: string | null;
    phoneNumber: string | null;
    avatarUrl: string | null;
    dateOfBirth: string | null;
    bio: string | null;
    shift: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  };
}

export async function getUserProfile(
  token: string,
): Promise<UserProfileResponse> {
  const res = await fetch(`${API_URL}/api/users/profile`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(
      errorData?.message || "Error al obtener el perfil de usuario",
    );
  }

  return res.json();
}

export interface UpdateProfilePayload {
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  dateOfBirth?: string | null;
  bio?: string | null;
}

export async function updateUserProfile(
  payload: UpdateProfilePayload,
): Promise<UserProfileResponse> {
  return apiFetch<UserProfileResponse>("/api/users/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export type BackendActivityStatus =
  "pending" | "approved" | "rejected" | "cancelled" | "rescheduled";

export interface ExternalLocationInput {
  googlePlaceId: string;
  name: string;
  formattedAddress?: string | null;
  latitude: number;
  longitude: number;
}

export interface ExternalLocation extends ExternalLocationInput {
  locationId: string;
}

export interface ActivityPersonnelMember {
  userId: string;
  username: string | null;
  email: string;
}

export interface BackendActivity {
  activityId: string;
  creatorId?: string;
  title: string | null;
  description: string | null;
  type?: "ordinary" | "extraordinary" | "entry" | null;
  startDate: string | null;
  endDate: string | null;
  creator: { userId: string; username: string | null };
  status: BackendActivityStatus;
  approvals: {
    planning: "pending" | "approved" | "rejected" | "cancelled" | "rescheduled";
    academic: "pending" | "approved" | "rejected" | "cancelled" | "rescheduled";
    administrative:
      "pending" | "approved" | "rejected" | "cancelled" | "rescheduled";
  };
  createdAt: string | null;
  updatedAt: string | null;
}

export type ActivityApprovalDirection =
  "planning" | "academic" | "administrative";
export type ActivityApprovalDecision =
  "approved" | "rejected" | "cancelled" | "rescheduled";

export interface CreateActivityInput {
  title: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  objectiveId?: string;
  type?: "ordinary" | "extraordinary" | "entry";
  requiresAuthority?: boolean;
  requiresCertified?: boolean;
  generalObservation?: string | null;
  creatorId?: string;
  externalLocations?: ExternalLocationInput[];
  spaceIds?: string[];
  personnelIds?: string[];
}

export async function getActivities(): Promise<{
  activities: BackendActivity[];
}> {
  return apiFetch<{ activities: BackendActivity[] }>(
    "/api/activities?page=1&limit=100",
  );
}

export async function createActivity(
  input: CreateActivityInput,
): Promise<{ activity: BackendActivity }> {
  return apiFetch<{ activity: BackendActivity }>("/api/activities", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateActivityApproval(
  activityId: string,
  direction: ActivityApprovalDirection,
  status: ActivityApprovalDecision,
  dates?: { startDate: string; endDate: string },
): Promise<{ activity: BackendActivity }> {
  return apiFetch<{ activity: BackendActivity }>(
    `/api/activities/${activityId}/approval`,
    {
      method: "PATCH",
      body: JSON.stringify({ direction, status, ...dates }),
    },
  );
}

export async function deleteActivity(activityId: string): Promise<void> {
  await apiFetch<void>(`/api/activities/${activityId}`, { method: "DELETE" });
}

export interface UpdateActivityInput {
  title?: string;
  description?: string | null;
  startDate?: string;
  endDate?: string;
  objectiveId?: string;
  type?: "ordinary" | "extraordinary" | "entry";
  requiresAuthority?: boolean;
  requiresCertified?: boolean;
  generalObservation?: string | null;
  creatorId?: string;
}

export async function updateActivity(
  activityId: string,
  input: UpdateActivityInput,
): Promise<{ activity: BackendActivity }> {
  return apiFetch<{ activity: BackendActivity }>(
    `/api/activities/${activityId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export async function getActivityExternalLocations(
  activityId: string,
): Promise<{ locations: ExternalLocation[] }> {
  return apiFetch(`/api/activities/${activityId}/external-locations`);
}

export async function attachActivityExternalLocations(
  activityId: string,
  locations: ExternalLocationInput[],
): Promise<{ locations: ExternalLocation[] }> {
  return apiFetch(`/api/activities/${activityId}/external-locations`, {
    method: "POST",
    body: JSON.stringify({ locations }),
  });
}

export async function removeActivityExternalLocation(
  activityId: string,
  locationId: string,
): Promise<void> {
  await apiFetch(
    `/api/activities/${activityId}/external-locations/${locationId}`,
    { method: "DELETE" },
  );
}

export async function getActivityPersonnel(
  activityId: string,
): Promise<{ users: ActivityPersonnelMember[] }> {
  return apiFetch(`/api/activities/${activityId}/personnel`);
}

export async function setActivityPersonnel(
  activityId: string,
  userIds: string[],
): Promise<{ users: ActivityPersonnelMember[] }> {
  return apiFetch(`/api/activities/${activityId}/personnel`, {
    method: "PUT",
    body: JSON.stringify({ userIds }),
  });
}

export type ReservationStatus =
  "pending" | "reserved" | "active" | "in_use" | "cancelled" | "completed";

export interface ReservationCreatorOption {
  userId: string;
  username: string | null;
  email: string;
}

export interface BackendReservation {
  reservationId: string;
  title: string | null;
  description: string | null;
  activityId: string | null;
  status: ReservationStatus | null;
  startTime: string | null;
  endTime: string | null;
  creator: { userId: string; username: string | null };
  spaces: Array<{
    spaceId: string;
    name: string | null;
    description: string | null;
    capacity: number | null;
    status: "active" | "inactive" | "undermaintenance";
  }>;
  createdAt: string | null;
  updatedAt: string | null;
  actions: { canView: boolean; canUpdate: boolean; canDelete: boolean };
}

export interface CreateReservationInput {
  title: string;
  description?: string | null;
  activityId?: string | null;
  startTime: string;
  endTime: string;
  creatorId?: string;
  spaceIds?: string[];
}

export interface UpdateReservationInput {
  title?: string;
  description?: string | null;
  activityId?: string | null;
  startTime?: string;
  endTime?: string;
  status?: ReservationStatus;
  spaceIds?: string[];
}

export interface ReservationSpaceOption {
  spaceId: string;
  name: string | null;
  description: string | null;
  capacity: number | null;
  status: "active" | "inactive" | "undermaintenance";
}

export interface ReservationsResponse {
  reservations: BackendReservation[];
  total: number;
  page: number;
  limit: number;
  capabilities: {
    canCreate: boolean;
    canManage: boolean;
    canViewAll: boolean;
  };
}

export async function getReservations(range?: {
  startTime?: string;
  endTime?: string;
}): Promise<ReservationsResponse> {
  const query = new URLSearchParams({ page: "1", limit: "100" });
  if (range?.startTime) query.set("startTime", range.startTime);
  if (range?.endTime) query.set("endTime", range.endTime);
  return apiFetch<ReservationsResponse>(
    `/api/reservations?${query.toString()}`,
  );
}

export async function getReservationSpaces(): Promise<{
  spaces: ReservationSpaceOption[];
}> {
  return apiFetch("/api/reservations/spaces");
}

export async function getReservationCreators(): Promise<{
  users: ReservationCreatorOption[];
}> {
  return apiFetch<{ users: ReservationCreatorOption[] }>(
    "/api/reservations/creators",
  );
}

export async function createReservation(
  input: CreateReservationInput,
): Promise<{ reservation: BackendReservation }> {
  return apiFetch<{ reservation: BackendReservation }>("/api/reservations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateReservation(
  reservationId: string,
  input: UpdateReservationInput,
): Promise<{ reservation: BackendReservation }> {
  return apiFetch<{ reservation: BackendReservation }>(
    `/api/reservations/${reservationId}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

export async function deleteReservation(reservationId: string): Promise<void> {
  await apiFetch<void>(`/api/reservations/${reservationId}`, {
    method: "DELETE",
  });
}

export interface UserNotification {
  notificationId: string;
  activityId: string | null;
  reservationId: string | null;
  title: string;
  message: string;
  type: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: UserNotification[];
  total: number;
  unread: number;
}

export async function getNotifications(
  options: { limit?: number; unreadOnly?: boolean } = {},
): Promise<NotificationsResponse> {
  const query = new URLSearchParams({
    page: "1",
    limit: String(options.limit ?? 50),
    unreadOnly: String(options.unreadOnly ?? false),
  });
  return apiFetch(`/api/notifications?${query.toString()}`);
}

export async function markNotificationRead(
  notificationId: string,
): Promise<void> {
  await apiFetch(`/api/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}

export interface Department {
  department_id: string;
  name: string;
  description: string | null;
}

export async function getDepartments(): Promise<{ departments: Department[] }> {
  return apiFetch<{ departments: Department[] }>('/api/departments', {
    method: 'GET',
  });
}

export async function createDepartment(data: {
  name: string;
  description?: string;
}): Promise<{ department: Department }> {
  return apiFetch<{ department: Department }>('/api/departments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateDepartment(
  id: string,
  data: { name?: string; description?: string }
): Promise<{ department: Department }> {
  return apiFetch<{ department: Department }>(`/api/departments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteDepartment(id: string): Promise<void> {
  return apiFetch<void>(`/api/departments/${id}`, {
    method: "DELETE",
  });
}