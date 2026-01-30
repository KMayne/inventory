import path from "node:path";
import { defineConfig } from "prisma/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

export default defineConfig({
  earlyAccess: true,
  schema: path.join(import.meta.dirname, "prisma", "schema.prisma"),
  migrate: {
    adapter: () => new PrismaBetterSqlite3({ url: "file:./data/inventory.db" }),
  },
  datasource: {
    url: "file:./data/inventory.db",
  },
});
