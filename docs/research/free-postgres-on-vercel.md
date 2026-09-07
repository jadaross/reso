# Free Postgres on the Vercel Marketplace (Hobby plan)

Researched 2026-09-06 against primary sources only (Vercel, Neon, Supabase, Prisma, Drizzle docs). Prices USD.

## Can a Hobby project install Marketplace Postgres at all?

Yes, as far as Vercel's docs show. Vercel Postgres is gone ("automatically moved it to Neon in December 2024"); Vercel's guidance is "install a Postgres integration from the Marketplace" [1]. No Vercel page gates native integrations by plan: the Hobby-vs-Pro table lists no Marketplace restriction (its "Storage: Blob" row is Vercel's first-party storage only) [3]; the REST API auto-discovers free plans ("For free resources, omit `billingPlanId`") and billing plans carry a `paymentMethodRequired: false` flag [7]; and Vercel's own canonical CLI example is `vercel install neon --name my-database --plan free -e production -e preview` [2]. Caveat: Hobby is "non-commercial, personal use only" [3] — fine for a friends-only app.

## Providers with a free tier (Marketplace storage category [4])

| | Neon | Supabase | Prisma Postgres |
|---|---|---|---|
| Storage | 0.5 GB / project [5] | 500 MB DB, shared CPU, 500 MB RAM [10] | 500 MB [13] |
| Compute / quota | 100 CU-hours / project / month (= 0.25 CU for 400 h) [6]; autoscale up to 2 CU | no compute quota; "Free projects are paused after 1 week of inactivity" [10][11] | 200k operations / month [13] |
| Suspend / scale-to-zero | after 5 min inactive; "For Neon Free plan users, this setting is fixed"; wakes "within a few hundred milliseconds" [8] | Pause is not auto-resume: "Resume project" is a manual dashboard click, restorable up to 1 year [11] | "Scale to zero when idle"; 60-min idle timeout [13] |
| Connections | 0.25 CU: max_connections 104 (97 usable); PgBouncer pooler accepts up to 10,000 clients [9] | not stated on pricing page | 10 pooled + 10 direct [13] |
| Projects / DBs | 100 projects [5][6] | "Limit of 2 active projects" [10] | 50 databases [13] |
| Branching | 10 branches / project; Marketplace integration creates `preview/<git-branch>` per Preview Deployment [12] | not on Free [10] | n/a |
| Other | PITR 6 h; 5 GB egress [6] | 5 GB egress, 50k MAU [10] | unlimited egress; 10-min pooled query timeout [14] |
| Next paid | Launch, pay-as-you-go [5] | Pro from $25/mo [10] | Starter $10/mo [13] |

Other storage listings (Turso = SQLite, AWS, Nile, Azure Cosmos, MongoDB, Upstash/Redis) are either not Postgres or not obviously free, so excluded [4].

## Env-var injection

Installing from Marketplace provisions the resource, connects it to the project, and "automatically adds environment variables to your project" for the environments you pick (Development / Preview / Production) [2][12]. `vercel install` also runs `vercel env pull` into `.env.local` [2]. A custom prefix (e.g. `DB1_`) namespaces them if you attach two DBs [2].

- **Neon**: `DATABASE_URL` (pooled, PgBouncer), `DATABASE_URL_UNPOOLED` (direct), `PGHOST`, `PGHOST_UNPOOLED`, `PGUSER`, `PGDATABASE`, `PGPASSWORD`, legacy `POSTGRES_*` [12].
- **Supabase**: `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_USER/HOST/PASSWORD/DATABASE`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_JWT_SECRET`, `NEXT_PUBLIC_SUPABASE_*` [15]. Marketplace-created Supabase projects can only be created via the Vercel dashboard and billing lives in Vercel [15].
- **Prisma Postgres**: `DATABASE_URL` (+ `DIRECT_URL` for a TCP connection usable by Drizzle/psql, host `db.prisma.io:5432`) [13][14].

## Drizzle support (Neon)

First-class. Drizzle ships `drizzle-orm/neon-http` and `drizzle-orm/neon-serverless` on top of `@neondatabase/serverless` [16]. Neon: HTTP "is faster for single, non-interactive transactions" (one-shot queries); use WebSockets "if you require session or interactive transaction support or compatibility with node-postgres" (needs `ws` + `bufferutil` in Node) [16][17]. HTTP still offers a non-interactive `transaction()` and Drizzle's batch API works with the Neon HTTP driver [17][18]. Practical rule for Reso: default to `neon-http` with `DATABASE_URL`; switch a specific code path to `neon-serverless` only if it needs `db.transaction()` with reads-then-writes. Vercel's own pooling guidance for Fluid compute (global pool, `attachDatabasePool`) applies if you pick the WebSocket/pg route [19].

## Vercel Cron on Hobby + a suspended DB

Hobby cron: 100 jobs, "Once per day" minimum, precision "Per-hour (±59 min)" — `0 1 * * *` fires anywhere 01:00-01:59; anything more frequent fails deployment [20]. With Neon this is harmless: the first query wakes the compute in ~hundreds of ms [8], and a daily wake burns roughly 5 min × 0.25 CU ≈ 0.02 CU-h against a 100 CU-h budget. The gotcha is the inverse — you cannot use Hobby cron as a keep-alive (once/day is the ceiling). That matters for Supabase: its pause is based on "sufficient user database activity over the past week" and "a few user requests to the database each day" keep it alive [11]; a quiet week means a manual "Resume project", not an automatic wake. Neon never needs un-pausing; a 12-person app just sees an occasional sub-second cold start.

## Recommendation

Use **Neon** via the Vercel Marketplace native integration on its Free plan. It is the only one of the three whose free tier combines a real compute budget (100 CU-h/month, far beyond a handful-of-tables app), automatic scale-to-zero with sub-second wake (no manual un-pausing, unlike Supabase's 1-week pause), branching that maps onto Vercel Preview Deployments, generous connection headroom through the built-in pooler, and first-class Drizzle drivers (`neon-http` by default). Prisma Postgres is a reasonable fallback (500 MB, 200k ops) but its 10-connection cap and operations-metered quota are tighter and its integration is Prisma-ORM-centric. Install with `vercel install neon --plan free -e production -e preview -e development`, point Drizzle at `DATABASE_URL` (pooled) and drizzle-kit at `DATABASE_URL_UNPOOLED`, keep any cron at once per day, and stay under 0.5 GB.

## Sources

1. https://vercel.com/docs/postgres
2. https://vercel.com/docs/marketplace-storage (and https://vercel.com/docs/integrations/install-an-integration/product-integration for prefixes/env injection)
3. https://vercel.com/docs/plans/hobby
4. https://vercel.com/marketplace/category/storage
5. https://neon.com/pricing
6. https://neon.com/docs/introduction/plans
7. https://vercel.com/docs/rest-api/integrations/create-integration-store-free-and-paid-plans ; https://vercel.com/docs/rest-api/integrations/list-integration-billing-plans
8. https://neon.com/docs/introduction/scale-to-zero
9. https://neon.com/docs/connect/connection-pooling
10. https://supabase.com/pricing
11. https://supabase.com/docs/guides/platform/free-project-pausing
12. https://neon.com/docs/guides/vercel-native-integration (and https://neon.com/docs/guides/vercel-managed-integration for billing-inside-Vercel)
13. https://www.prisma.io/pricing ; https://www.prisma.io/docs/postgres/integrations/vercel
14. https://www.prisma.io/docs/postgres/database/direct-connections
15. https://supabase.com/docs/guides/integrations/vercel-marketplace ; https://vercel.com/marketplace/supabase
16. https://orm.drizzle.team/docs/connect-neon
17. https://neon.com/docs/serverless/serverless-driver
18. https://orm.drizzle.team/docs/batch-api
19. https://vercel.com/kb/guide/connection-pooling-with-functions
20. https://vercel.com/docs/cron-jobs/usage-and-pricing
