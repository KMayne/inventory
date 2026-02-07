import type { InventoryDoc, Session } from "@inventory/shared";
import { Router, type IRouter, type Request, type Response } from "express";
import { config } from "../config.ts";
import { hashPassword, verifyPassword } from "../password.ts";
import { getRepo } from "../repo.ts";
import {
  createInventoryAccess,
  createSession,
  createUser,
  deleteSession,
  getInventoriesForUser,
  getUserById,
  getUserByUsername,
  refreshSession,
  updateUser,
} from "../store/index.ts";

const auth: IRouter = Router();

// POST /auth/register
auth.post("/register", async (req: Request, res: Response) => {
  const { username, name, password } = req.body as {
    username: string;
    name: string;
    password: string;
  };

  if (!username || typeof username !== "string" || username.trim().length === 0) {
    res.status(400).json({ error: "Username is required" });
    return;
  }

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "Name is required" });
    return;
  }

  if (!password || typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  try {
    // Check if username is already taken
    const existing = await getUserByUsername(username.trim());
    if (existing) {
      res.status(409).json({ error: "Username already taken" });
      return;
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser(username.trim(), passwordHash, name.trim());

    // Create default inventory
    const repo = getRepo();
    const handle = repo.create<InventoryDoc>();
    handle.change((doc) => {
      doc.items = {};
    });
    await createInventoryAccess(handle.documentId, user.id, "Inventory");

    // Create session
    const session = await createSession(user.id);
    setSessionCookie(res, session);

    res.json({
      user: { id: user.id, name: user.name },
      inventoryId: handle.documentId,
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST /auth/login
auth.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body as {
    username: string;
    password: string;
  };

  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  try {
    const user = await getUserByUsername(username.trim());
    if (!user) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    // Create session
    const session = await createSession(user.id);
    setSessionCookie(res, session);

    const userInventories = await getInventoriesForUser(user.id);

    res.json({
      user: { id: user.id, name: user.name },
      inventories: userInventories.map((inv) => ({
        id: inv.inventoryId,
        name: inv.name,
        isOwner: inv.ownerId === user.id,
      })),
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// GET /auth/me
auth.get("/me", async (req: Request, res: Response) => {
  const sessionId = req.cookies[config.sessionCookieName];
  if (!sessionId) {
    res.json({ user: null });
    return;
  }

  const session = await refreshSession(sessionId);
  if (!session) {
    clearSessionCookie(res);
    res.json({ user: null });
    return;
  }

  const user = await getUserById(session.userId);
  if (!user) {
    clearSessionCookie(res);
    res.json({ user: null });
    return;
  }

  setSessionCookie(res, session);

  const userInventories = await getInventoriesForUser(user.id);

  res.json({
    user: { id: user.id, name: user.name },
    inventories: userInventories.map((inv) => ({
      id: inv.inventoryId,
      name: inv.name,
      isOwner: inv.ownerId === user.id,
    })),
  });
});

// PATCH /auth/me
auth.patch("/me", async (req: Request, res: Response) => {
  const sessionId = req.cookies[config.sessionCookieName];
  if (!sessionId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const session = await refreshSession(sessionId);
  if (!session) {
    clearSessionCookie(res);
    res.status(401).json({ error: "Not authenticated" });
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

  const user = await updateUser(session.userId, updates);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  setSessionCookie(res, session);
  res.json({ user });
});

// POST /auth/logout
auth.post("/logout", async (req: Request, res: Response) => {
  const sessionId = req.cookies[config.sessionCookieName];
  if (sessionId) {
    await deleteSession(sessionId);
  }
  clearSessionCookie(res);
  res.json({ success: true });
});


export function setSessionCookie(res: Response, session: Session) {
  res.cookie(config.sessionCookieName, session.id, {
    httpOnly: true,
    secure: config.origin.startsWith("https"),
    sameSite: "lax",
    maxAge: config.sessionMaxAge,
    path: "/",
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(config.sessionCookieName, {
    path: "/",
  });
}

export { auth };
