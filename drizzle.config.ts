import { existsSync, readFileSync } from "node:fs";

import { defineConfig } from "drizzle-kit";

/*
 * drizzle-kit runs outside Next, so nothing has loaded .env.local for it. Next
 * itself loads that file, and asking developers to keep a second copy of the same
 * credentials in .env is how the two drift apart.
 */
for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    process.env[match[1]] ??= match[2].trim().replace(/^["']|["']$/g, "");
  }
}

// drizzle-kit needs a direct connection, not the pooled one: DATABASE_URL from the
// Neon integration points at PgBouncer, which cannot run DDL transactions.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: url ?? "" },
  strict: true,
  verbose: true,
});
