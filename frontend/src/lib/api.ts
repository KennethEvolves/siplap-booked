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