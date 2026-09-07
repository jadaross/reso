# Reso — wayfinder map

Status: **reached.** The destination was a v1 spec ready to build slice by slice. It exists at
`.scratch/reso/spec.md`, with build tickets 08–17 in `issues/`. All seven decision tickets are
resolved and no fog remains. Work continues on the build tickets, not on this map.

Label: wayfinder:map
Tracker: local markdown (`.scratch/reso/`), see plugin doc `issue-tracker-local.md`.

## Destination

A written v1 spec for Reso — the monthly restaurant-draw site for one London friend group — covering the data model, the monthly cycle rules, every screen, the reminder flow, and the repo layout on Next.js + Vercel, ready to be built slice by slice in separate sessions. Not the build itself.

## Notes

- Domain glossary: `/CONTEXT.md`. Rules settled while charting: `.scratch/reso/charting-decisions.md`. Read both before any ticket.
- Research already done: `docs/research/reminder-channels.md`, `docs/research/restaurant-import.md`, `docs/research/free-postgres-on-vercel.md`, `docs/research/maps-link-parsing.md`, `docs/research/pwa-and-web-push.md`, `docs/research/ios-storage-persistence.md`. New research findings go in `docs/research/<name>.md`.
- Skills every session should consult: `/grilling` and `/domain-modeling` for grilling tickets; `/prototype` for the look-and-feel ticket; `/research` for research tickets. Vercel plugin skills (`vercel:nextjs`, `vercel:vercel-storage`, `vercel:vercel-functions`) when a decision touches the platform.
- Standing preferences: everything must be free to run (Vercel Hobby, free-tier database). Mobile-first; installed to the iPhone home screen. Keep it simple — no merging of duplicate restaurants, no filtering of the draw, no bulk import.
- The human driving this map is Jada (repo owner, sole Admin to start).
- Implementation has begun ahead of the spec, at Jada's request: the foundation (schema, identity, cycle engine, Maps parsing, PWA/push, daily cron) is built and pushed. Screens are placeholders pending ticket 06 and no message wording exists pending ticket 05. Ticket 07's repo-layout half was decided in code; its spec half is still open. See README.md.

## Decisions so far

<!-- one line per closed ticket: gist, then link for the detail -->

- [Which free Postgres on the Vercel Marketplace, and its limits](issues/01-free-postgres-on-vercel.md) — Neon Free via the Marketplace native integration, with Drizzle's neon-http driver. Supabase Free pauses after a week idle and Hobby's once-a-day cron can't reliably keep it awake.
- [Installable web app and push notifications on iPhone from Next.js](issues/03-pwa-and-web-push-on-ios.md) — Standard VAPID web push works with no Apple account; a static service worker is enough. The installed app gets a fresh cookie jar, so the group secret must live in the URL path and the name pick must happen inside the installed app.
- [Extracting name, address and coordinates from pasted Maps links without an API](issues/02-maps-link-parsing.md) — Apple links carry name, address and coordinates in the URL itself, so they parse cleanly. Google short links give only a name and coordinates, never an address. Always store the raw link and fall back to the typed name.
- [How the shared link, name-picking, and Admin PIN behave](issues/04-shared-link-identity.md) — The whole app sits under `/g/<secret>`; identity is a signed HttpOnly cookie per Device, durable because installed Home Screen apps are exempt from ITP. Names are not exclusive and switching is one tap. Removal archives. One Group-wide Admin PIN, 30-day unlock. The secret is only a bootstrap credential, so rotating it costs nothing for Devices already installed.
- [Look and feel: a throwaway prototype of the phone screens](issues/06-look-and-feel-prototype.md) — Direction A, the ticket: a bone card with a tear line on a near-black field, amber accent, Bricolage Grotesque over Inter Tight. B's per-day density bars are folded into its calendar so consensus is visible while it forms. Agent's call under Jada's standing delegation.
- [The reminder and announcement messages: when, to whom, and what they say](issues/05-message-schedule-and-wording.md) — Five push moments across the cycle plus one Admin share; the 8th nudges only the silent; nothing reaches WhatsApp without a human tap. Wording is a draft, the schedule is settled. Cron drift is fine, so Workflows are not needed.
- [Write the v1 spec and repo layout](issues/07-write-the-spec-and-repo-layout.md) — The destination. Spec at `.scratch/reso/spec.md`, build tickets 08–17 alongside it. Repo layout was settled in code and is documented in the README. Three fog items became decisions here rather than tickets.

## Not yet specified

Nothing. The fog is clear: every question this map set out to answer has been answered, and the
three that were still vague at the last frontier became decisions in the spec rather than new
tickets.

## Out of scope

- Multi-group / anyone can start a group. Ruled out while charting; one Group only.
- Bulk restaurant import (Google Takeout CSV, iOS Shortcut share target, paste-a-list). Jada: "I don't think there needs to be a bulk upload." Findings kept in `docs/research/restaurant-import.md` if it ever returns.
- Google Places or Apple Maps API lookups for price level and cuisine. Both cost money or a paid membership; v1 is type-the-name.
- Email to Members, Telegram or Discord delivery, SMS. WhatsApp share plus push covers v1.
- Provisioning (Vercel project, database, GitHub hookup) and the build itself. That is the next effort once the spec exists.
