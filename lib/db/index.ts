import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

type Db = ReturnType<typeof create>;

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. It is injected by the Neon integration on Vercel; " +
        "locally, copy it from the Neon dashboard into .env.local.",
    );
  }
  return drizzle(neon(url), { schema });
}

let cached: Db | undefined;

/**
 * The Drizzle client, created on first use.
 *
 * Deliberately lazy: `DATABASE_URL` is absent at build time and in any tests that
 * do not touch Postgres, and connecting at module scope would turn that into a
 * build failure rather than an error at the point of use.
 */
export function getDb(): Db {
  cached ??= create();
  return cached;
}

export { schema };
