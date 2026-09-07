# Reso — decisions settled while charting the map (2026-09-06)

Settled in the charting grilling session with Jada. Terms are defined in `/CONTEXT.md`; this file records the rules and choices that are not vocabulary.

## Scope

- One Group only. Multi-group is out of scope.
- 6–12 Members to start, all in London. Currency is GBP, timezone Europe/London.
- Entry is a shared secret link; a Member then picks their own name from the list. No passwords, no email login.
- Admin actions (add/remove Members, override a month's Price Tier, override the Chosen Date, reroll the Draw, close availability early) are unlocked with a PIN held by Admin-flagged Members.
- Booking the table is a human task. The site announces date and place; a person books.
- Plus-one is a per-Member, per-Outing flag. Headcount = Members available on the Chosen Date + their Plus-ones. There is no separate "going / not going" step; a Member who can no longer come untaps that day.

## The monthly cycle

- Each calendar month has one Outing.
- On the 1st of the month before, the Outing opens: Members tap the days of that month they are free (whole days, dinner implied, one tap toggles a day).
- Close Day is the 22nd of the month before. On Close Day the site locks Availability, computes the Chosen Date, runs the Draw, and produces the announcement.
- Chosen Date rule: the day with the most available Members wins. Ties: Friday or Saturday beats a weekday, then the earliest day wins.
- A Member with no Availability recorded counts as unavailable every day.
- Quorum: if the best day has fewer than 3 Members, the site never cancels; it shows the Admin the top days and the Admin decides.
- Admin can see the top three days and choose a different one.

## Price Tiers and the Draw

- Tiers are Low, Medium, High. Every Pick carries one, chosen by whoever adds it, editable by anyone afterwards.
- Tier Rotation: Low, Medium, High, repeating, starting with Low for the first Outing. Admin can override a single Outing's tier.
- The Draw is a uniformly random pick among all Picks in the Outing's tier. Every Pick is a ticket. Nothing is filtered by who is available and nothing is excluded for having been visited before. A place two Members added is therefore twice as likely.
- Duplicates are not merged. Two Members adding the same place is two Picks, by design.
- Admin may reroll once per Outing; the reroll is visible in the month's history.

## Restaurants

- Adding a Pick is free of any paid API: type the name, optionally paste an Apple Maps or Google Maps link, and the site extracts name/address/coordinates from the link where it can.
- No bulk upload. Out of scope.
- No Apple or Google Places lookup in v1 (Apple needs a paid developer membership; Google needs a card on file). Out of scope unless hand-picking tiers proves annoying.

## After the dinner

- Each Outing becomes a Visit: who came, and each attendee's Rating (1–5) with an optional short Note.
- A history page lists past Visits.

## Reminders

- WhatsApp cannot be posted to from a server (see `docs/research/reminder-channels.md`). The site drafts each message and shows a Share button; the Admin taps Share, picks WhatsApp, picks the group.
- Every Member is asked to add the site to their iPhone home screen, so it must be an installable web app (manifest, icons, standalone display).
- Push notifications go to every Member who allows them: "tap your dates", last call, and the announcement. WhatsApp share is the backup announcement channel, not the only one.

## Stack

- Next.js App Router on Vercel Hobby (free), Postgres from the Vercel Marketplace on a free tier, Drizzle for the schema, Tailwind + shadcn/ui, one daily Vercel cron (Hobby allows one run per day with up to an hour of drift, which is fine for the 1st/5th/15th/20th/22nd schedule).
- Look and feel: no preference from Jada beyond "not a default template" and app-like on a phone.
