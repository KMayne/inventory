import { Router, type Request, type Response, type IRouter } from "express";
import { requireAuth } from "../app.ts";
import {
  createInventoryAccess,
  getInventoriesForUser,
  isInventoryOwner,
  addMemberToInventory,
  removeMemberFromInventory,
  deleteInventoryAccess,
} from "../store/index.ts";
import { getRepo } from "../repo.ts";
import type { InventoryDoc } from "@inventory/shared";

const inventories: IRouter = Router();

// All routes require auth
inventories.use(requireAuth);

// GET /api/inventories
inventories.get("/", (req: Request, res: Response) => {
  const user = req.user!;
  const userInventories = getInventoriesForUser(user.id);

  res.json({
    inventories: userInventories.map((a) => ({
      id: a.inventoryId,
      isOwner: a.ownerId === user.id,
    })),
  });
});

// POST /api/inventories
inventories.post("/", async (req: Request, res: Response) => {
  const user = req.user!;
  const { name } = req.body as { name?: string };
  const inventoryName = name?.trim() || "New Inventory";

  const repo = getRepo();
  const handle = repo.create<InventoryDoc>();
  handle.change((doc) => {
    doc.name = inventoryName;
    doc.items = {};
  });

  createInventoryAccess(handle.documentId, user.id);

  res.json({
    inventory: {
      id: handle.documentId,
      isOwner: true,
    },
  });
});

// DELETE /api/inventories/:id
inventories.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const user = req.user!;
  const inventoryId = req.params.id;

  if (!isInventoryOwner(user.id, inventoryId)) {
    res.status(403).json({ error: "Only the owner can delete an inventory" });
    return;
  }

  deleteInventoryAccess(inventoryId);

  // Note: We're not deleting the Automerge document itself
  // In a real app, you might want to mark it as deleted or archive it

  res.json({ success: true });
});

// POST /api/inventories/:id/members
inventories.post("/:id/members", async (req: Request<{ id: string }>, res: Response) => {
  const user = req.user!;
  const inventoryId = req.params.id;

  if (!isInventoryOwner(user.id, inventoryId)) {
    res.status(403).json({ error: "Only the owner can add members" });
    return;
  }

  const { userId } = req.body as { userId: string };

  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const success = addMemberToInventory(inventoryId, userId);
  if (!success) {
    res.status(404).json({ error: "Inventory not found" });
    return;
  }

  res.json({ success: true });
});

// DELETE /api/inventories/:id/members/:uid
inventories.delete("/:id/members/:uid", async (req: Request<{ id: string; uid: string }>, res: Response) => {
  const user = req.user!;
  const inventoryId = req.params.id;
  const memberId = req.params.uid;

  if (!isInventoryOwner(user.id, inventoryId)) {
    res.status(403).json({ error: "Only the owner can remove members" });
    return;
  }

  const success = removeMemberFromInventory(inventoryId, memberId);
  if (!success) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  res.json({ success: true });
});

export { inventories };
