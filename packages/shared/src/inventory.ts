export interface InventoryAccess {
  inventoryId: string; // = Automerge document ID
  name: string;
  ownerId: string;
  memberIds: string[];
}

export interface InventoryDoc {
  items: { [id: string]: InventoryItem };
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  notes: string | null;
  locationPath: string[];
  attributes: ItemAttribute[];
}

export type AttributeType = "text" | "number" | "date" | "file";

export interface ItemAttribute {
  id: string;
  key: string;
  type: AttributeType;
  value: string;
}

export type NewInventoryItem = Omit<InventoryItem, "id">;
export type NewItemAttribute = Omit<ItemAttribute, "id">;
