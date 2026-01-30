import express, { type Application, type Request, type Response, type NextFunction, type RequestHandler } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config.ts";
import { refreshSession, deleteSession } from "./store/index.ts";
import type { Session, User } from "@inventory/shared";
import { getUserById } from "./store/index.ts";

// Extend Express Request type with our custom properties
declare global {
  namespace Express {
    interface Request {
      session?: Session;
      user?: User;
    }
  }
}

export const app: Application = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// CORS for frontend
app.use(
  cors({
    origin: config.origin,
    credentials: true,
  })
);

// Auth middleware helper
export const requireAuth: RequestHandler = (req, res, next) => {
  const sessionId = req.cookies[config.sessionCookieName];
  if (!sessionId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const session = refreshSession(sessionId);
  if (!session) {
    clearSessionCookie(res);
    res.status(401).json({ error: "Session expired" });
    return;
  }

  const user = getUserById(session.userId);
  if (!user) {
    clearSessionCookie(res);
    res.status(401).json({ error: "User not found" });
    return;
  }

  req.session = session;
  req.user = user;

  // Update session cookie with new expiry
  setSessionCookie(res, session);

  next();
};

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
