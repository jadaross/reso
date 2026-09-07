# Reso

A private site for one friend group in London that picks a restaurant to visit each
month and finds the date most of the group can make.

The vocabulary — Group, Member, Pick, Outing, Draw, Close Day — is defined in
[`CONTEXT.md`](./CONTEXT.md) and used exactly in the code. Read that first.

## Where this is up to

The foundation is built and tested. The screens are not, because two decisions are
still open on the [wayfinder map](./.scratch/reso/map.md).

| Area | State |
| --- | --- |
| Data model (Drizzle + Postgres) | Built |
| Group Link, identity, Admin PIN | Built — [ticket 04](./.scratch/reso/issues/04-shared-link-identity.md) |
| Tier Rotation, Chosen Date, the Draw | Built and tested |
| Apple / Google Maps link parsing | Built and tested — [ticket 02](./.scratch/reso/issues/02-maps-link-parsing.md) |
| Installable web app + Web Push | Built — [ticket 03](./.scratch/reso/issues/03-pwa-and-web-push-on-ios.md) |
| Daily cron: open, close, complete | Built |
| **Every screen** | **Placeholder** — blocked on [ticket 06](./.scratch/reso/issues/06-look-and-feel-prototype.md) |
| **Reminder and announcement wording** | **Not started** — blocked on [ticket 05](./.scratch/reso/issues/05-message-schedule-and-wording.md) |

Two smaller things are deliberately unresolved in the code and marked where they
sit: there is no Admin PIN lockout policy, and an Outing whose tier has no Picks
closes with no Drawn Pick rather than falling through to another tier.

## It is live

**https://reso-phi.vercel.app** — the Group Link is the whole front door. Everyone opens it, taps
their name, then adds Reso to their Home Screen and taps their name once more inside the installed
app (it starts with a cookie jar of its own).

## Getting it running locally

Everything below is free. Nothing here needs a card.

The quickest local setup is Postgres on your own machine rather than a cloud database — the client
picks its driver from the URL, so a `localhost` `DATABASE_URL` uses node-postgres and anything else
uses Neon's:

```bash
createdb reso_dev
# then in .env.local:
#   DATABASE_URL=postgresql://$(whoami)@localhost:5432/reso_dev
#   DATABASE_URL_UNPOOLED=postgresql://$(whoami)@localhost:5432/reso_dev
```

**1. Create the database.** From the Vercel dashboard, add the Neon integration to
the project on the Free plan. It injects `DATABASE_URL` (pooled, via PgBouncer) and
`DATABASE_URL_UNPOOLED` (direct). Neon was chosen over Supabase because Supabase
Free pauses after a week of inactivity and Hobby's once-a-day cron cannot reliably
keep it awake — see [ticket 01](./.scratch/reso/issues/01-free-postgres-on-vercel.md).

**2. Fill in the environment.** Copy `.env.example` to `.env.local` and set:

```bash
# Signs the identity and Admin-unlock cookies
openssl rand -base64 48

# VAPID keys for Web Push
pnpm exec web-push generate-vapid-keys

# Any long random string; Vercel Cron sends it as a bearer token
openssl rand -hex 32
```

The same variables need to exist in the Vercel project.

**3. Create the tables and bootstrap the Group.**

```bash
pnpm db:migrate
pnpm exec tsx scripts/seed.ts --admin "Jada" --pin <your-pin> \
  --members "Lottie,Sienna,Scotty,Sophie,Jack"
```

The seed prints your Group Link — a path like `/g/k7m2q9xr4vn8bc3t`. That is the
whole front door. Everyone opens it, taps their name, then adds Reso to their Home
Screen. There is nothing else to log in with.

**4. Run it.**

```bash
pnpm dev
```

### On iPhone

The identity cookie lives in the installed app, which starts with a cookie jar of
its own, separate from Safari — so whoever adds Reso to their Home Screen has to
tap their name again inside the installed app. That is expected, not a bug. Once
they have, they stay signed in: installed Home Screen web apps are exempt from
Safari's tracking-prevention data purge. The evidence is in
[`docs/research/ios-storage-persistence.md`](./docs/research/ios-storage-persistence.md).

## Commands

| Command | Does |
| --- | --- |
| `pnpm dev` | Run locally |
| `pnpm test` | Run the unit tests |
| `pnpm typecheck` | Typecheck without building |
| `pnpm lint` | ESLint |
| `pnpm db:generate` | Generate a migration from a schema change |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:studio` | Browse the data |

## Layout

```
app/
  g/[secret]/       the whole app — never redirects away from the Group Link
  api/cron/         the daily job: open, close, complete
  api/push/         push subscription storage
  manifest.ts       deliberately has no start_url (see the file)
lib/
  db/               Drizzle schema and lazy client
  identity/         Group Link, per-Device identity, Admin PIN
  cycle/            tier rotation, Chosen Date, the Draw, Close Day
  maps/             parsing pasted Apple and Google Maps links
  push/             sending Web Push
proxy.ts            slides the identity cookie forward on every request
```

The repo layout was going to be settled by
[ticket 07](./.scratch/reso/issues/07-write-the-spec-and-repo-layout.md) along with
the spec; it has been decided here instead, ahead of that ticket.
