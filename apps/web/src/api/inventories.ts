const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
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

export interface InventoryInfo {
  id: string;
  name: string;
  isOwner: boolean;
}

export interface UserInfo {
  id: string;
  name: string;
}

export const inventoryApi = {
  list(): Promise<{ inventories: InventoryInfo[] }> {
    return api("/api/inventories");
  },

  create(name: string): Promise<{ inventory: InventoryInfo }> {
    return api("/api/inventories", {
      method: "POST",
      body: { name },
    });
  },

  delete(id: string): Promise<{ success: boolean }> {
    return api(`/api/inventories/${id}`, { method: "DELETE" });
  },

  addMember(inventoryId: string, userId: string): Promise<{ success: boolean }> {
    return api(`/api/inventories/${inventoryId}/members`, {
      method: "POST",
      body: { userId },
    });
  },

  removeMember(inventoryId: string, userId: string): Promise<{ success: boolean }> {
    return api(`/api/inventories/${inventoryId}/members/${userId}`, {
      method: "DELETE",
    });
  },

  getMembers(inventoryId: string): Promise<{ members: UserInfo[] }> {
    return api(`/api/inventories/${inventoryId}/members`);
  },

  getPossibleMembers(inventoryId: string): Promise<{ users: UserInfo[] }> {
    return api(`/api/inventories/${inventoryId}/possible-members`);
  },
};
