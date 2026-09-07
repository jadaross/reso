# Which free Postgres on the Vercel Marketplace, and its limits

Type: research
Status: resolved
Blocked by: —

## Question

Reso must cost nothing to run. Which Vercel Marketplace Postgres providers (Neon, Supabase, Prisma Postgres, others) offer a free tier that can be provisioned from a Vercel Hobby project, and what are the exact limits that matter for a 12-person app with a handful of tables: storage, compute hours or auto-suspend behaviour, connection limits, branching, and whether Hobby projects can install them at all? Also: does Drizzle have first-class support for the recommended provider's serverless driver? Recommend one.

Findings go in `docs/research/free-postgres-on-vercel.md`.

## Answer

Neon, Supabase and Prisma Postgres all expose a free plan through the Vercel Marketplace and nothing in Vercel's docs gates native integrations by plan (Vercel's own example is `vercel install neon --plan free`); Hobby only requires non-commercial use.
Neon Free: 0.5 GB/project, 100 CU-hours/month (0.25 CU for 400 h), 100 projects, 10 branches/project, fixed 5-minute scale-to-zero with ~sub-second wake, max_connections 104 at 0.25 CU plus a PgBouncer pooler; the integration injects DATABASE_URL (pooled) and DATABASE_URL_UNPOOLED plus PG*/POSTGRES_* vars into the environments you choose and can branch per Preview Deployment.
Supabase Free: 500 MB, 2 projects, no branching, and projects pause after 1 week of inactivity with a manual "Resume" (Hobby cron is capped at once/day, ±59 min, so it cannot reliably keep it warm). Prisma Postgres Free: 500 MB, 200k ops/month, 10 pooled + 10 direct connections.
Drizzle has first-class Neon drivers: `drizzle-orm/neon-http` (one-shot queries, batch API) and `drizzle-orm/neon-serverless` (WebSocket, interactive transactions).
Recommendation: Neon Free via the Marketplace native integration, Drizzle `neon-http` on DATABASE_URL, drizzle-kit on DATABASE_URL_UNPOOLED; a daily cron waking it costs a negligible fraction of the compute budget.
Findings: docs/research/free-postgres-on-vercel.md
