const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:4001';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);

    this.name = 'ApiError';
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('accessToken');
}

export function saveToken(token: string) {
  if (typeof window !== 'undefined') {
    // 1. Guardamos en localStorage como lo tenías
    localStorage.setItem('accessToken', token);
    
    // 2. ¡NUEVO! Guardamos también en una cookie para que el Middleware la pueda leer
    document.cookie = `accessToken=${token}; path=/; max-age=86400; SameSite=Lax`;
  }
}

export function removeToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    // Borramos la cookie también al cerrar sesión
    document.cookie = 'accessToken=; path=/; max-age=0';
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  requiresAuth = true,
): Promise<T> {
  const headers =
    new Headers(options.headers);

  if (options.body) {
    headers.set(
      'Content-Type',
      'application/json',
    );
  }

  if (requiresAuth) {
    const token = getToken();

    if (token) {
      headers.set(
        'Authorization',
        `Bearer ${token}`,
      );
    }
  }

  const response =
    await fetch(
      `${API_URL}${path}`,
      {
        ...options,
        headers,
        cache: 'no-store',
      },
    );

  const text =
    await response.text();

  let data: any = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {
        message: text,
      };
    }
  }

  if (!response.ok) {
    throw new ApiError(
      data?.message ??
        `Error HTTP ${response.status}`,

      response.status,
    );
  }

  return data as T;
}