import type { LoginResponse } from '../types/auth';

function toApiBaseUrl(baseUrl?: string) {
  if (!baseUrl) return '/api';

  const normalizedUrl = baseUrl.replace(/\/+$/, '');
  return normalizedUrl.endsWith('/api') ? normalizedUrl : `${normalizedUrl}/api`;
}

const API_BASE_URL = toApiBaseUrl(import.meta.env.VITE_API_URL);

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(payload.message ?? 'Request failed', response.status);
  }

  return payload as T;
}

function toQuery(params: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}

export const api = {
  login(email: string, password: string) {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },
  me() {
    return request<{ user: LoginResponse['user'] }>('/auth/me');
  },
  get<T>(path: string, params: Record<string, string | number | boolean | undefined> = {}) {
    return request<T>(`${path}${toQuery(params)}`);
  },
  post<T>(path: string, body: unknown) {
    return request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },
  put<T>(path: string, body: unknown) {
    return request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },
  patch<T>(path: string, body: unknown) {
    return request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  }
};
