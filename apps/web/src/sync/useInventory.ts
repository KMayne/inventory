import { useMemo, useCallback } from "react";
import { useDocument } from "@automerge/react";
import type {
  InventoryDoc,
  InventoryItem,
  NewInventoryItem,
} from "@inventory/shared";
import { useInventoryId } from "./context";

export function useInventory() {
  const inventoryId = useInventoryId();
  const [doc, changeDoc] = useDocument<InventoryDoc>(inventoryId ?? undefined);

  const items = useMemo(() => {
    if (!doc?.items) return [];
    return Object.values(doc.items);
  }, [doc?.items]);

  const addItem = useCallback(
    (newItem: NewInventoryItem): InventoryItem | null => {
      if (!changeDoc) return null;

      const item: InventoryItem = {
        ...newItem,
        id: crypto.randomUUID(),
        attributes: newItem.attributes.map((attr) => ({
          ...attr,
          id: crypto.randomUUID(),
        })),
      };

      changeDoc((d) => {
        if (!d.items) d.items = {};
        d.items[item.id] = item;
      });

      return item;
    },
    [changeDoc]
  );

  const updateItem = useCallback(
    (item: InventoryItem) => {
      if (!changeDoc) return;

      changeDoc((d) => {
        if (!d.items?.[item.id]) return;
        const existing = d.items[item.id];
        existing.name = item.name;
        existing.quantity = item.quantity;
        existing.notes = item.notes;
        existing.locationPath = [...item.locationPath];
        existing.attributes = item.attributes.map((attr) => ({ ...attr }));
      });
    },
    [changeDoc]
  );

  const removeItem = useCallback(
    (id: string): boolean => {
      if (!changeDoc || !doc?.items?.[id]) return false;

      changeDoc((d) => {
        if (!d.items) return;
        delete d.items[id];
      });

      return true;
    },
    [changeDoc, doc?.items]
  );

  const getItem = useCallback(
    (id: string): InventoryItem | undefined => {
      return doc?.items?.[id];
    },
    [doc?.items]
  );

  return {
    items,
    isLoading: inventoryId !== null && !doc,
    addItem,
    updateItem,
    removeItem,
    getItem,
  };
}

export function useInventoryItems() {
  const { items } = useInventory();
  return items;
}

export function useInventoryMutations() {
  const { addItem, updateItem, removeItem } = useInventory();
  return { addItem, updateItem, removeItem };
}
