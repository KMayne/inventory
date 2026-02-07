import type { Server as HttpServer, IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer } from "ws";
import { parse as parseCookie } from "cookie";
import { config } from "../config.ts";
import { getSession, getUserById } from "../store/index.ts";
import type { Session, User } from "@homie/shared";

export interface AuthenticatedRequest extends IncomingMessage {
  session: Session;
  user: User;
}

export function setupWebSocketSync(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    // Only handle /sync path
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    if (url.pathname !== "/sync") {
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.destroy();
      return;
    }

    try {
      // Parse session from cookie
      const cookies = parseCookie(req.headers.cookie ?? "");
      const sessionId = cookies[config.sessionCookieName];

      if (!sessionId) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      const session = await getSession(sessionId);
      if (!session) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      const user = await getUserById(session.userId);
      if (!user) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      // Attach auth info to request
      const authReq = req as AuthenticatedRequest;
      authReq.session = session;
      authReq.user = user;

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, authReq);
      });
    } catch (err) {
      console.error("WebSocket upgrade error:", err);
      socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
      socket.destroy();
    }
  });

  return wss;
}
