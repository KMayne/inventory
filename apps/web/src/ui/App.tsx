import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../auth";
import { useSearchItems, useItemMutations } from "../store";
import {
  SearchBar,
  ItemList,
  AddItemModal,
  EditItemModal,
  InventorySelector,
  InventorySettingsModal,
  ProfileModal,
  BulkImportModal,
} from "./components";
import type { Item, NewItem } from "../domain";

function getSearchFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("q") ?? "";
}

function buildUrlWithSearch(query: string): string {
  const params = new URLSearchParams(window.location.search);
  if (query) {
    params.set("q", query);
  } else {
    params.delete("q");
  }
  const search = params.toString();
  return window.location.pathname + (search ? `?${search}` : "") + window.location.hash;
}

function useSearchQuery() {
  const [query, setQueryState] = useState(getSearchFromUrl);

  useEffect(() => {
    function handlePopState() {
      setQueryState(getSearchFromUrl());
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const setQuery = useCallback((newQuery: string) => {
    const url = buildUrlWithSearch(newQuery);
    window.history.replaceState(null, "", url);
    setQueryState(newQuery);
  }, []);

  return [query, setQuery] as const;
}

function useHashModal(hashName: string) {
  const hash = `#${hashName}`;
  const [isOpen, setIsOpenState] = useState(() => window.location.hash === hash);

  useEffect(() => {
    function handleHashChange() {
      setIsOpenState(window.location.hash === hash);
    }
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handleHashChange);
    };
  }, [hash]);

  const setIsOpen = useCallback((open: boolean) => {
    if (open) {
      window.history.pushState(null, "", window.location.pathname + window.location.search + hash);
    } else {
      window.history.pushState(null, "", window.location.pathname + window.location.search);
    }
    setIsOpenState(open);
  }, [hash]);

  return [isOpen, setIsOpen] as const;
}

export function App() {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useSearchQuery();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [settingsOpen, setSettingsOpen] = useHashModal("settings");
  const [showBulkImportModal, setShowBulkImportModal] = useHashModal("import");

  const items = useSearchItems(searchQuery);
  const { addItem, updateItem, removeItem } = useItemMutations();

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Ignore logout errors
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>Homie</h1>
        </div>
        <div className="header-right">
          <button onClick={() => setShowProfileModal(true)} className="btn-user-name">
            {user?.name}
          </button>
          <button onClick={handleLogout} className="btn-logout">
            Sign out
          </button>
        </div>
      </header>

      <div className="inventory-bar">
        <InventorySelector onOpenSettings={() => setSettingsOpen(true)} />
      </div>

      <main className="app-main">
        <div className="toolbar">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-add-item"
          >
            + Add Item
          </button>
          <button
            onClick={() => setShowBulkImportModal(true)}
            className="btn-import"
          >
            Import items
          </button>
        </div>

        <ItemList
          items={items}
          onEditItem={setEditingItem}
          onDeleteItem={removeItem}
        />
      </main>

      {showAddModal && (
        <AddItemModal
          onSave={addItem}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editingItem && (
        <EditItemModal
          item={editingItem}
          onSave={updateItem}
          onDelete={removeItem}
          onClose={() => setEditingItem(null)}
        />
      )}

      {settingsOpen && (
        <InventorySettingsModal onClose={() => setSettingsOpen(false)} />
      )}

      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}

      {showBulkImportModal && (
        <BulkImportModal
          onImport={(items: NewItem[]) => items.forEach(addItem)}
          onClose={() => setShowBulkImportModal(false)}
        />
      )}
    </div>
  );
}
