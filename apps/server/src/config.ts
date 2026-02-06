import { existsSync, readFileSync } from "fs";
import { join } from "path";

const dataDir = process.env.DATA_DIR ?? "./data";

// Read HA add-on options.json if present
let haOptions: { rp_id?: string; origin?: string } = {};
const optionsPath = join(dataDir, "options.json");
if (existsSync(optionsPath)) {
  try {
    haOptions = JSON.parse(readFileSync(optionsPath, "utf-8"));
  } catch {
    // ignore malformed options.json
  }
}

export const config = {
  port: parseInt(process.env.PORT ?? "3000", 10),

  // WebAuthn
  rpName: "Inventory App",
  rpID: process.env.RP_ID ?? haOptions.rp_id ?? "localhost",
  origin: process.env.ORIGIN ?? haOptions.origin ?? "http://localhost:5173",

  // Sessions
  sessionCookieName: "session",
  sessionMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms

  // Storage
  dataDir,
};
