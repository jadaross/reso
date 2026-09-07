import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzleNode } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

/**
 * One type, not a union of the two drivers. Drizzle's query builders are identical
 * across them but their generic types are not structurally compatible, and a union
 * collapses every call signature to the ones they share — which is none. Callers
 * write the same queries either way, so the Neon type is the one they see.
 */
type Db = ReturnType<typeof drizzleHttp<typeof schema>>;

/**
 * Neon's driver speaks an HTTP protocol that only Neon serves, so a plain Postgres
 * on localhost cannot answer it. Both are real Postgres and Drizzle presents the
 * same API over either, so the driver is chosen from the URL rather than from a
 * separate flag someone has to remember to set.
 *
 * In production this is always the Neon branch; locally it is usually a database
 * on the developer's own machine, which costs nothing and works on a plane.
 */
function isLocal(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".local")
    );
  } catch {
    return false;
  }
}

function create(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. It is injected by the Neon integration on Vercel; " +
        "locally, point it at a Postgres on your own machine (see the README).",
    );
  }
  if (isLocal(url)) {
    return drizzleNode(url, { schema }) as unknown as Db;
  }
  return drizzleHttp(neon(url), { schema });
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
