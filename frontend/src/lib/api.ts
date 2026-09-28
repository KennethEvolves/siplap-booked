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

export function getToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem('accessToken');
}

export function saveToken(token: string) {
  localStorage.setItem('accessToken', token);
}

export function removeToken() {
  localStorage.removeItem('accessToken');
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  requiresAuth = true,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (requiresAuth) {
    const token = getToken();

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

  let data: unknown = null;

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
