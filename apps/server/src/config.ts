import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { z } from "zod";

const envDataDir = process.env.DATA_DIR ?? "./data";

const haOptionsSchema = z.object({
  origins: z.array(z.string().url()).optional(),
  data_dir: z.string().optional(),
});

// Read HA add-on options.json if present
const optionsPath = join(envDataDir, "options.json");
const haOptions = existsSync(optionsPath)
  ? haOptionsSchema.parse(JSON.parse(readFileSync(optionsPath, "utf-8")))
  : {};

export const config = {
  port: parseInt(process.env.PORT ?? "3000", 10),

  origins: haOptions.origins?.length
    ? haOptions.origins
    : [process.env.ORIGIN ?? "http://localhost:5173"],

  // Sessions
  sessionCookieName: "session",
  sessionMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms

  // Storage
  dataDir: haOptions.data_dir ?? envDataDir,
};
