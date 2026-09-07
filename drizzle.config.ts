import { defineConfig } from "drizzle-kit";

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
