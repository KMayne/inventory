import type { Session, User } from "@homie/shared";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Application } from "express";
import { config } from "./config.ts";
import { auth } from "./routes/auth.ts";
import { inventories } from "./routes/inventories.ts";

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
    origin: config.origins,
    credentials: true,
  }),
);

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
  });
  next();
});

// Mount routes
app.use("/api/auth", auth);
app.use("/api/inventories", inventories);

// Health check
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

const staticDir = "../web/dist";
app.use("/", express.static(staticDir));

// SPA fallback: serve index.html for non-API routes
app.get("*", (_req, res) => {
  res.sendFile("index.html", { root: staticDir });
});
