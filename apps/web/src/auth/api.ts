const API_BASE = import.meta.env.VITE_API_URL ?? "";

interface ApiOptions {
  method?: string;
  body?: unknown;
}

async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }

  return response.json();
}

export interface UserInfo {
  id: string;
  name: string;
}

export interface InventoryInfo {
  id: string;
  name: string;
  isOwner: boolean;
}

export interface MeResponse {
  user: UserInfo | null;
  inventories?: InventoryInfo[];
}

export interface RegisterResponse {
  user: UserInfo;
  inventoryId: string;
}

export interface LoginResponse {
  user: UserInfo;
  inventories: InventoryInfo[];
}

export const authApi = {
  me(): Promise<MeResponse> {
    return api("/api/auth/me");
  },

  register(username: string, name: string, password: string): Promise<RegisterResponse> {
    return api("/api/auth/register", {
      method: "POST",
      body: { username, name, password },
    });
  },

  login(username: string, password: string): Promise<LoginResponse> {
    return api("/api/auth/login", {
      method: "POST",
      body: { username, password },
    });
  },

  logout(): Promise<{ success: boolean }> {
    return api("/api/auth/logout", { method: "POST" });
  },

  updateMe(data: { name?: string }): Promise<{ user: UserInfo }> {
    return api("/api/auth/me", {
      method: "PATCH",
      body: data,
    });
  },
};
