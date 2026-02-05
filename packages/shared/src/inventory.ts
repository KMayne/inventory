import { z } from "zod";

// Schemas
export const attributeTypeSchema = z.enum(["text", "number", "date", "file"]);

export const itemAttributeSchema = z.object({
  id: z.string(),
  key: z.string().min(1, "Attribute key is required"),
  type: attributeTypeSchema,
  value: z.string(),
});

export const newItemAttributeSchema = itemAttributeSchema.omit({ id: true });

export const inventoryItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  quantity: z.number().int().positive("Quantity must be a positive integer"),
  notes: z.string().nullable(),
  locationPath: z.array(z.string()),
  attributes: z.array(itemAttributeSchema),
});

export const newInventoryItemSchema = inventoryItemSchema.omit({ id: true }).extend({
  attributes: z.array(newItemAttributeSchema),
});

export const importItemSchema = newInventoryItemSchema.extend({
  notes: z.string().nullable().optional(),
  locationPath: z.array(z.string()).optional().default([]),
  attributes: z.array(newItemAttributeSchema).optional().default([]),
});

export const importItemsSchema = z.array(importItemSchema).min(1, "Array must contain at least one item");

// Types derived from schemas
export type AttributeType = z.infer<typeof attributeTypeSchema>;
export type ItemAttribute = z.infer<typeof itemAttributeSchema>;
export type NewItemAttribute = z.infer<typeof newItemAttributeSchema>;
export type InventoryItem = z.infer<typeof inventoryItemSchema>;
export type NewInventoryItem = z.infer<typeof newInventoryItemSchema>;

// Non-Automerge types (stored in database)
export interface InventoryAccess {
  inventoryId: string; // = Automerge document ID
  name: string;
  ownerId: string;
  memberIds: string[];
}

export interface InventoryDoc {
  items: { [id: string]: InventoryItem };
}
