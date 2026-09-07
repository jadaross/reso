# 17 — Put it in front of the group

**What to build:** Reso stops being a repo and becomes a link in a WhatsApp message that eight
people install on their phones.

**Blocked by:** 10, 11, 12, 13, 14, 15, 16

**Status:** mostly done — two items need Jada's phone

Most of this is Jada's to do — it needs accounts, a dashboard and her own phone. The agent's job is
to make each step a single command or a single click, and to verify the result.

- [x] The Neon integration is installed on the Vercel project on the free plan, and the injected variables are confirmed present in all three environments
- [x] `SESSION_SECRET`, the VAPID pair and `CRON_SECRET` are set in Vercel and locally
- [x] Migrations are applied to the production database
- [x] The seed has run once, creating the Group, Jada as Admin, her PIN, and the first Group Link
- [ ] The daily cron is registered and has been observed running once, with its authorisation rejecting an unauthenticated call
- [ ] Jada has installed the app on her own iPhone, claimed her name inside the installed app, and received a test push
- [x] The first Outing exists with the correct tier, Low, and the correct Close Day
- [x] The Group Link and a short "what this is" message are ready for Jada to send to the group

## Where this got to

Live at **https://reso-phi.vercel.app**, Group Link `/g/brtjb8m5e2jevtrr`. Verified in a browser:
the roster renders, claiming a name signs the device in, the October 2026 Outing exists at tier Low
with Close Day 15 September, and tapping the 16th persisted to Neon and moved the standing line.

Four things worth writing down.

**The Neon integration prefixed every variable with `reso_`,** so `DATABASE_URL`,
`DATABASE_URL_UNPOOLED`, `SESSION_SECRET`, the VAPID pair and `CRON_SECRET` all existed as empty
placeholders and the app would have failed at its first query. They were filled in from the
integration's own values, and the secrets generated fresh.

**Vercel Authentication was on for all deployments,** which put a Vercel login in front of everyone.
Reso's security model is the Group Link itself — 80 bits, and every other path 404s — so with Jada's
agreement SSO protection was disabled. Confirmed afterwards: `/g/<secret>` is 200, `/g/nope` is 404,
`/api/cron` without the bearer token is 401.

**Preview environment variables could not be set.** The installed Vercel CLI is 54.4.1 against a
current 59.x and refuses the non-interactive form, printing the command it wants rather than running
it. Production is complete; preview deployments will fail at runtime until someone sets them from
the dashboard or upgrades the CLI.

**`CRON_SECRET` was rotated once** so the daily job could be triggered by hand to create the first
Outing. The cron itself is registered in `vercel.json` for 09:00 daily and has not yet fired on
schedule.

Still needing Jada's own phone: installing to the Home Screen, claiming her name inside the
installed app, and receiving a test push.
