import { Router, type Request, type Response, type IRouter } from "express";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/types";
import { config } from "../config.ts";
import {
  createUser,
  getUserById,
  getUserByCredentialId,
  addCredentialToUser,
  getCredentialById,
  updateCredentialCounter,
  createSession,
  refreshSession,
  deleteSession,
  createInventoryAccess,
  getInventoriesForUser,
} from "../store/index.ts";
import {
  setSessionCookie,
  clearSessionCookie,
} from "../app.ts";
import { getRepo } from "../repo.ts";
import type { InventoryDoc } from "@inventory/shared";

const auth: IRouter = Router();

// Store challenges temporarily (in production, use a proper store)
const challenges = new Map<string, string>(); // tempId -> challenge

// POST /auth/register/start
auth.post("/register/start", async (req: Request, res: Response) => {
  const { name } = req.body as { name: string };

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "Name is required" });
    return;
  }

  const tempId = crypto.randomUUID();

  const options = await generateRegistrationOptions({
    rpName: config.rpName,
    rpID: config.rpID,
    userName: name.trim(),
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  challenges.set(tempId, options.challenge);

  // Clean up old challenges after 5 minutes
  setTimeout(() => challenges.delete(tempId), 5 * 60 * 1000);

  res.json({ options, tempId });
});

// POST /auth/register/finish
auth.post("/register/finish", async (req: Request, res: Response) => {
  const { tempId, name, response } = req.body as {
    tempId: string;
    name: string;
    response: RegistrationResponseJSON;
  };

  const challenge = challenges.get(tempId);
  if (!challenge) {
    res.status(400).json({ error: "Challenge expired or invalid" });
    return;
  }
  challenges.delete(tempId);

  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: config.origin,
      expectedRPID: config.rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      res.status(400).json({ error: "Registration verification failed" });
      return;
    }

    const { credential } = verification.registrationInfo;

    // Create user
    const user = await createUser(name.trim());

    // Add credential
    await addCredentialToUser(user.id, {
      id: credential.id,
      publicKey: credential.publicKey,
      counter: credential.counter,
      transports: response.response.transports,
    });

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

// POST /auth/login/start
auth.post("/login/start", async (req: Request, res: Response) => {
  const tempId = crypto.randomUUID();

  const options = await generateAuthenticationOptions({
    rpID: config.rpID,
    userVerification: "preferred",
  });

  challenges.set(tempId, options.challenge);
  setTimeout(() => challenges.delete(tempId), 5 * 60 * 1000);

  res.json({ options, tempId });
});

// POST /auth/login/finish
auth.post("/login/finish", async (req: Request, res: Response) => {
  const { tempId, response } = req.body as {
    tempId: string;
    response: AuthenticationResponseJSON;
  };

  const challenge = challenges.get(tempId);
  if (!challenge) {
    res.status(400).json({ error: "Challenge expired or invalid" });
    return;
  }
  challenges.delete(tempId);

  try {
    // Find user by credential ID
    const user = await getUserByCredentialId(response.id);
    if (!user) {
      res.status(401).json({ error: "Credential not found" });
      return;
    }

    const credential = await getCredentialById(user.id, response.id);
    if (!credential) {
      res.status(401).json({ error: "Credential not found" });
      return;
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: config.origin,
      expectedRPID: config.rpID,
      credential: {
        id: credential.id,
        publicKey: credential.publicKey,
        counter: credential.counter,
        transports: credential.transports,
      },
    });

    if (!verification.verified) {
      res.status(401).json({ error: "Authentication failed" });
      return;
    }

    // Update counter
    await updateCredentialCounter(
      user.id,
      credential.id,
      verification.authenticationInfo.newCounter
    );

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

// POST /auth/logout
auth.post("/logout", async (req: Request, res: Response) => {
  const sessionId = req.cookies[config.sessionCookieName];
  if (sessionId) {
    await deleteSession(sessionId);
  }
  clearSessionCookie(res);
  res.json({ success: true });
});

export { auth };
