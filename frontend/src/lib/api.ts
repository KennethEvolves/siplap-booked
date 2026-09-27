import { auth } from './auth';

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

// Funciones de compatibilidad para evitar romper páginas existentes
export function getToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('accessToken');
}

export function saveToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', token);
  }
}

export function removeToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
  }
}

/**
 * Obtiene el token JWT:
 * 1. Si está en el servidor, lo obtiene de la sesión de Auth.js.
 * 2. Si está en el cliente, consulta la sesión de Auth.js o usa el fallback local.
 */
export async function getAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') {
    const session = await auth();
    return (session?.user as any)?.accessToken ?? null;
  }

  try {
    const res = await fetch('/api/auth/session');
    if (res.ok) {
      const session = await res.json();
      if (session?.user?.accessToken) {
        return session.user.accessToken;
      }
    }
  } catch {
    // Si falla la consulta de sesión, recurre al almacenamiento local
  }

  return getToken();
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

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    cache: 'no-store',
  });

  const text = await response.text();
  let data: any = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    throw new ApiError(
      data?.message ?? `Error HTTP ${response.status}`,
      response.status,
    );
  }

  return data as T;
}