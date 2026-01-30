import { app } from "./app.ts";
import { auth } from "./routes/auth.ts";
import { inventories } from "./routes/inventories.ts";
import { setupWebSocketSync } from "./ws/sync.ts";
import { createRepo } from "./repo.ts";
import { config } from "./config.ts";

// Mount routes
app.use("/auth", auth);
app.use("/api/inventories", inventories);

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Start server
const server = app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log(`WebSocket sync available at ws://localhost:${config.port}/sync`);
});

// Setup WebSocket for Automerge sync
const wss = setupWebSocketSync(server);

// Initialize Automerge repo with WebSocket adapter
createRepo(wss);
