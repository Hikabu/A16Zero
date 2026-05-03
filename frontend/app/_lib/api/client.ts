const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// JWT stored in memory only — never localStorage (per spec)
let authToken: string | null = null;

export function setToken(token: string) {
  authToken = token;
}

export function clearToken() {
  authToken = null;
}

export function getToken() {
  return authToken;
}

export function isApiConfigured() {
  return !!BASE_URL;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  if (!BASE_URL) {
    throw new Error("API_NOT_CONFIGURED");
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options?.headers ?? {}),
    },
  });

  if (res.status === 401) {
    clearToken();
    throw new Error("UNAUTHORIZED");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? `HTTP ${res.status}`);
  }

  const raw = await res.json();
  // Unwrap backend envelope { success, data, message? }
  if (raw !== null && typeof raw === "object" && "success" in raw && "data" in raw) {
    return raw.data as T;
  }
  return raw as T;
}
