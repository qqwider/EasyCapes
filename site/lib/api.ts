const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787") + "/api/v1";

export interface Cape {
  id: string;
  type: string;
  url: string;
  hash: string;
  meta: { width?: number; height?: number; frames?: { index: number; delayMs: number }[] };
}

export interface UserInfo {
  mcName: string;
  uuid: string | null;
  authType: "premium" | "offline";
  role: string;
  hasCape: boolean;
}

export interface ApiError {
  code: string;
  message: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(API + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const body = await res.json();
  if (!body.ok) {
    throw (body.error as ApiError) ?? { code: "UNKNOWN", message: "Неизвестная ошибка" };
  }
  return body as T;
}

export function register(mcName: string, password: string) {
  return request<{ token: string; user: UserInfo }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ mcName, password }),
  });
}

export function login(mcName: string, password: string) {
  return request<{ token: string; user: UserInfo }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ mcName, password }),
  });
}

export function me(token: string) {
  return request<{ user: UserInfo }>("/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function setCape(token: string, url: string) {
  return request<{ cape: Cape }>("/me/cape", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ url }),
  });
}

export function deleteCape(token: string) {
  return request<{ ok: true }>("/me/cape", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function fetchCapes(names: string[]) {
  return request<{ capes: Record<string, Cape | null> }>(`/capes?names=${names.join(",")}`);
}

export function fetchGallery(limit = 50, offset = 0) {
  return request<{ items: { name: string; cape: Cape; createdAt: string }[]; total: number }>(
    `/gallery?limit=${limit}&offset=${offset}`,
  );
}
