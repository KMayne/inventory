import type { InventoryDoc } from "@homie/shared";
import { Router, type IRouter, type Request, type Response } from "express";
import { getRepo } from "../repo.ts";
import {
  addMemberToInventory,
  createInventoryAccess,
  deleteInventoryAccess,
  getAvailableUsersForInventory,
  getInventoriesForUser,
  getInventoryMembersWithNames,
  getUserById,
  isInventoryOwner,
  refreshSession,
  removeMemberFromInventory,
  updateInventory,
} from "../store/index.ts";
import { clearSessionCookie, setSessionCookie } from "./auth.ts";
import { config } from "../config.ts";

const inventories: IRouter = Router();

// All routes require auth
inventories.use(async (req, res, next) => {
  const sessionId = req.cookies[config.sessionCookieName];
  if (!sessionId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const session = await refreshSession(sessionId);
  if (!session) {
    clearSessionCookie(res);
    res.status(401).json({ error: "Session expired" });
    return;
  }

  const user = await getUserById(session.userId);
  if (!user) {
    clearSessionCookie(res);
    res.status(401).json({ error: "User not found" });
    return;
  }

  req.session = session;
  req.user = user;

  // Update session cookie with new expiry
  setSessionCookie(req, res, session);

  next();
});

// GET /api/inventories
inventories.get("/", async (req: Request, res: Response) => {
  const user = req.user!;
  const userInventories = await getInventoriesForUser(user.id);

  res.json({
    inventories: userInventories.map((inv) => ({
      id: inv.inventoryId,
      name: inv.name,
      isOwner: inv.ownerId === user.id,
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
    doc.items = {};
  });

  await createInventoryAccess(handle.documentId, user.id, inventoryName);

  res.json({
    inventory: {
      id: handle.documentId,
      name: inventoryName,
      isOwner: true,
    },
  });
});

// PATCH /api/inventories/:id
inventories.patch(
  "/:id",
  async (req: Request<{ id: string }>, res: Response) => {
    const user = req.user!;
    const inventoryId = req.params.id;

    if (!(await isInventoryOwner(user.id, inventoryId))) {
      res.status(403).json({ error: "Only the owner can update an inventory" });
      return;
    }

    const { name } = req.body as { name?: string };
    const updates: { name?: string } = {};

    if (name !== undefined) {
      if (!name.trim()) {
        res.status(400).json({ error: "Name cannot be empty" });
        return;
      }
      updates.name = name.trim();
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    const inventory = await updateInventory(inventoryId, updates);
    if (!inventory) {
      res.status(404).json({ error: "Inventory not found" });
      return;
    }

    res.json({ inventory });
  },
);

// DELETE /api/inventories/:id
inventories.delete(
  "/:id",
  async (req: Request<{ id: string }>, res: Response) => {
    const user = req.user!;
    const inventoryId = req.params.id;

    if (!(await isInventoryOwner(user.id, inventoryId))) {
      res.status(403).json({ error: "Only the owner can delete an inventory" });
      return;
    }

    await deleteInventoryAccess(inventoryId);

    // Note: We're not deleting the Automerge document itself
    // In a real app, you might want to mark it as deleted or archive it

    res.json({ success: true });
  },
);

// GET /api/inventories/:id/members
inventories.get(
  "/:id/members",
  async (req: Request<{ id: string }>, res: Response) => {
    const user = req.user!;
    const inventoryId = req.params.id;

    if (!(await isInventoryOwner(user.id, inventoryId))) {
      res.status(403).json({ error: "Only the owner can view members" });
      return;
    }

    const result = await getInventoryMembersWithNames(inventoryId);
    if (!result) {
      res.status(404).json({ error: "Inventory not found" });
      return;
    }

    res.json({ members: result.members });
  },
);

// GET /api/inventories/:id/possible-members
inventories.get(
  "/:id/possible-members",
  async (req: Request<{ id: string }>, res: Response) => {
    const user = req.user!;
    const inventoryId = req.params.id;

    if (!(await isInventoryOwner(user.id, inventoryId))) {
      res
        .status(403)
        .json({ error: "Only the owner can view available users" });
      return;
    }

    const users = await getAvailableUsersForInventory(inventoryId, user.id);
    res.json({ users });
  },
);

// POST /api/inventories/:id/members
inventories.post(
  "/:id/members",
  async (req: Request<{ id: string }>, res: Response) => {
    const user = req.user!;
    const inventoryId = req.params.id;

    if (!(await isInventoryOwner(user.id, inventoryId))) {
      res.status(403).json({ error: "Only the owner can add members" });
      return;
    }

    const { userId } = req.body as { userId: string };

    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const success = await addMemberToInventory(inventoryId, userId);
    if (!success) {
      res.status(404).json({ error: "Inventory not found" });
      return;
    }

    res.json({ success: true });
  },
);

// DELETE /api/inventories/:id/members/:uid
inventories.delete(
  "/:id/members/:uid",
  async (req: Request<{ id: string; uid: string }>, res: Response) => {
    const user = req.user!;
    const inventoryId = req.params.id;
    const memberId = req.params.uid;

    if (!(await isInventoryOwner(user.id, inventoryId))) {
      res.status(403).json({ error: "Only the owner can remove members" });
      return;
    }

    const success = await removeMemberFromInventory(inventoryId, memberId);
    if (!success) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    res.json({ success: true });
  },
);

export { inventories };
