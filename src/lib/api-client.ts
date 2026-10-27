export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  avatarColor?: string;
}

export interface ApiSuccess<T> {
  success: true;
  data?: T;
  [key: string]: unknown;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: unknown;
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiError;

export async function api<T = unknown>(
  input: string,
  init?: RequestInit
): Promise<ApiEnvelope<T>> {
  const res = await fetch(input, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const data = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!data) {
    return { success: false, message: `Request failed (${res.status})` };
  }
  return data;
}
