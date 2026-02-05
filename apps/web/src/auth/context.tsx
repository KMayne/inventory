import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";
import {
  authApi,
  type UserInfo,
  type InventoryInfo,
} from "./api";

function getInventoryIdFromUrl(): string | null {
  const match = window.location.pathname.match(/^\/inventory\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function navigateToInventory(id: string, preserveHash = true) {
  const hash = preserveHash ? window.location.hash : "";
  window.history.replaceState(null, "", `/inventory/${encodeURIComponent(id)}${hash}`);
}

interface AuthState {
  user: UserInfo | null;
  inventories: InventoryInfo[];
  currentInventoryId: string | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  register: (name: string) => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  setCurrentInventoryId: (id: string) => void;
  setInventories: (inventories: InventoryInfo[]) => void;
  addInventory: (inventory: InventoryInfo) => void;
  updateInventory: (id: string, updates: Partial<InventoryInfo>) => void;
  removeInventory: (id: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    inventories: [],
    currentInventoryId: null,
    isLoading: true,
  });

  // Check if user is already logged in
  useEffect(() => {
    authApi
      .me()
      .then((data) => {
        const inventories = data.inventories ?? [];
        const urlInventoryId = getInventoryIdFromUrl();

        // Use URL inventory if valid, otherwise use first inventory
        let currentInventoryId: string | null = null;
        if (urlInventoryId && inventories.some((i) => i.id === urlInventoryId)) {
          currentInventoryId = urlInventoryId;
        } else if (inventories.length > 0) {
          currentInventoryId = inventories[0].id;
          navigateToInventory(inventories[0].id);
        }

        setState({
          user: data.user,
          inventories,
          currentInventoryId,
          isLoading: false,
        });
      })
      .catch(() => {
        setState({ user: null, inventories: [], currentInventoryId: null, isLoading: false });
      });
  }, []);

  // Handle browser back/forward
  useEffect(() => {
    function handlePopState() {
      const urlInventoryId = getInventoryIdFromUrl();
      if (urlInventoryId) {
        setState((prev) => {
          if (prev.inventories.some((i) => i.id === urlInventoryId)) {
            return { ...prev, currentInventoryId: urlInventoryId };
          }
          return prev;
        });
      }
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const register = useCallback(async (name: string) => {
    // Get registration options from server
    const { options, tempId } = await authApi.registerStart(name);

    // Start WebAuthn registration
    const credential = await startRegistration({ optionsJSON: options });

    // Finish registration on server
    const result = await authApi.registerFinish(tempId, name, credential);

    const inventories = [{ id: result.inventoryId, name: "Inventory", isOwner: true }];
    navigateToInventory(result.inventoryId, false);
    setState({
      user: result.user,
      inventories,
      currentInventoryId: result.inventoryId,
      isLoading: false,
    });
  }, []);

  const login = useCallback(async () => {
    // Get authentication options from server
    const { options, tempId } = await authApi.loginStart();

    // Start WebAuthn authentication
    const credential = await startAuthentication({ optionsJSON: options });

    // Finish login on server
    const result = await authApi.loginFinish(tempId, credential);

    const currentInventoryId = result.inventories[0]?.id ?? null;
    if (currentInventoryId) {
      navigateToInventory(currentInventoryId, false);
    }
    setState({
      user: result.user,
      inventories: result.inventories,
      currentInventoryId,
      isLoading: false,
    });
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setState({ user: null, inventories: [], currentInventoryId: null, isLoading: false });
  }, []);

  const setCurrentInventoryId = useCallback((id: string) => {
    navigateToInventory(id, false);
    setState((prev) => ({ ...prev, currentInventoryId: id }));
  }, []);

  const setInventories = useCallback((inventories: InventoryInfo[]) => {
    setState((prev) => ({
      ...prev,
      inventories,
      // If current inventory was removed, switch to first one
      currentInventoryId: inventories.find((i) => i.id === prev.currentInventoryId)
        ? prev.currentInventoryId
        : inventories[0]?.id ?? null,
    }));
  }, []);

  const addInventory = useCallback((inventory: InventoryInfo) => {
    navigateToInventory(inventory.id, false);
    setState((prev) => ({
      ...prev,
      inventories: [...prev.inventories, inventory],
      currentInventoryId: inventory.id,
    }));
  }, []);

  const updateInventory = useCallback((id: string, updates: Partial<InventoryInfo>) => {
    setState((prev) => ({
      ...prev,
      inventories: prev.inventories.map((inv) =>
        inv.id === id ? { ...inv, ...updates } : inv
      ),
    }));
  }, []);

  const removeInventory = useCallback((id: string) => {
    setState((prev) => {
      const inventories = prev.inventories.filter((i) => i.id !== id);
      const newCurrentId = prev.currentInventoryId === id
        ? inventories[0]?.id ?? null
        : prev.currentInventoryId;

      if (newCurrentId && newCurrentId !== prev.currentInventoryId) {
        navigateToInventory(newCurrentId, false);
      }

      return {
        ...prev,
        inventories,
        currentInventoryId: newCurrentId,
      };
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        register,
        login,
        logout,
        setCurrentInventoryId,
        setInventories,
        addInventory,
        updateInventory,
        removeInventory,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
