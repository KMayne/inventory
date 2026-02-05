import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/types";

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

export interface RegisterStartResponse {
  options: PublicKeyCredentialCreationOptionsJSON;
  tempId: string;
}

export interface RegisterFinishResponse {
  user: UserInfo;
  inventoryId: string;
}

export interface LoginStartResponse {
  options: PublicKeyCredentialRequestOptionsJSON;
  tempId: string;
}

export interface LoginFinishResponse {
  user: UserInfo;
  inventories: InventoryInfo[];
}

export const authApi = {
  me(): Promise<MeResponse> {
    return api("/auth/me");
  },

  registerStart(name: string): Promise<RegisterStartResponse> {
    return api("/auth/register/start", {
      method: "POST",
      body: { name },
    });
  },

  registerFinish(
    tempId: string,
    name: string,
    response: unknown
  ): Promise<RegisterFinishResponse> {
    return api("/auth/register/finish", {
      method: "POST",
      body: { tempId, name, response },
    });
  },

  loginStart(): Promise<LoginStartResponse> {
    return api("/auth/login/start", { method: "POST" });
  },

  loginFinish(tempId: string, response: unknown): Promise<LoginFinishResponse> {
    return api("/auth/login/finish", {
      method: "POST",
      body: { tempId, response },
    });
  },

  logout(): Promise<{ success: boolean }> {
    return api("/auth/logout", { method: "POST" });
  },

  updateMe(data: { name?: string }): Promise<{ user: UserInfo }> {
    return api("/auth/me", {
      method: "PATCH",
      body: data,
    });
  },
};
