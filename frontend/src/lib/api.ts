'use client';

import { getSession, signOut } from 'next-auth/react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Elimina credenciales del flujo anterior al iniciar o cerrar sesión.
export function removeToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    document.cookie = 'accessToken=; path=/; max-age=0';
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
  endingSession ??= signOut({ redirectTo: '/login' });
  await endingSession;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  requiresAuth = true,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (requiresAuth) {
    const token = await getAccessToken();

    if (!token) {
      await expireSession();
      throw new ApiError('Tu sesión terminó. Inicia sesión nuevamente.', 401);
    }
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    cache: 'no-store',
  });

  if (requiresAuth && response.status === 401) {
    await expireSession();
    throw new ApiError('Tu sesión terminó. Inicia sesión nuevamente.', 401);
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
      typeof data === 'object' && data !== null && 'message' in data
        ? Array.isArray(data.message)
          ? data.message.join('. ')
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

export async function getUserProfile(token: string): Promise<UserProfileResponse> {
  const res = await fetch(`${API_URL}/api/users/profile`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Error al obtener el perfil de usuario');
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

export async function updateUserProfile(payload: UpdateProfilePayload): Promise<UserProfileResponse> {
  return apiFetch<UserProfileResponse>('/api/users/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// ==========================================
// Módulo de Actividades (RBAC + Workflows)
// ==========================================

export type BackendActivityStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'rescheduled';

export interface BackendActivity {
  activityId: string;
  title: string | null;
  description: string | null;
  type?: 'ordinary' | 'extraordinary' | 'entry' | null;
  startDate: string | null;
  endDate: string | null;
  creator: { userId: string; username: string | null };
  status: BackendActivityStatus;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateActivityInput {
  title: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  creatorId?: string;
}

export async function getActivities(): Promise<{ activities: BackendActivity[] }> {
  return apiFetch<{ activities: BackendActivity[] }>('/api/activities');
}

export async function createActivity(input: CreateActivityInput): Promise<{ activity: BackendActivity }> {
  return apiFetch<{ activity: BackendActivity }>('/api/activities', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateActivityApproval(
  activityId: string, 
  status: 'approved' | 'rejected' | 'cancelled' | 'rescheduled'
): Promise<{ activity: BackendActivity }> {
  return apiFetch<{ activity: BackendActivity }>(`/api/activities/${activityId}/approval`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function deleteActivity(activityId: string): Promise<void> {
  await apiFetch<void>(`/api/activities/${activityId}`, { method: 'DELETE' });
}

export interface UpdateActivityInput {
  title?: string;
  description?: string | null;
  startDate?: string;
  endDate?: string;
  creatorId?: string;
}

export async function updateActivity(
  activityId: string,
  input: UpdateActivityInput
): Promise<{ activity: BackendActivity }> {
  return apiFetch<{ activity: BackendActivity }>(`/api/activities/${activityId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
