# 18 — Keep the draw to the restaurants of people who can actually come

**What's wrong:** Every Pick in the month's tier is a ticket in the Draw, whoever added it and
whoever can make the Chosen Date. So a place someone chose themselves can win on a night they
already said they cannot do, and they miss their own restaurant.

**What to build:** At Close Day, once the Chosen Date is known, only the Picks of Members who are
free on that date go into the Draw.

**Blocked by:** nothing

**Status:** open

- [ ] The Draw at Close Day is built from the Picks of Members who are available on the Chosen Date, not from the whole tier
- [ ] The Admin's reroll draws from the same narrowed pool, so the two paths cannot disagree
- [ ] The reveal's "why it won" counts tickets from the same pool it actually drew from
- [ ] The empty-tier warning on the Admin panel and the empty-tier message reflect the same rule
- [ ] Archiving a Member keeps behaving as ticket 16 decided: their Picks stay in the pool
- [ ] `lib/cycle/cycle.test.ts` covers a Pick belonging to someone unavailable on the Chosen Date, and the case where the narrowing empties the pool

## Where it is

`lib/cycle/close.ts:126` selects every Pick in `outing.tier` with no reference to Availability, and
hands that straight to `drawFrom`. The Chosen Date is already computed a few lines above
(`computeChosenDate`), so the information needed to narrow the pool is in hand at the right moment.

Three other places build the same tier-wide candidate set and would drift out of step with a fix in
close alone:

- `app/g/[secret]/(app)/admin/admin-actions.ts:238` — the reroll
- `lib/cycle/messages.ts:253` — the "nothing in this tier" nudge
- `app/g/[secret]/(app)/admin/page.tsx:53` — the panel's empty-tier warning

Worth pulling the candidate query into one function in `lib/cycle/` so there is a single answer to
"what is in this month's draw".

## This overturns a written decision

`lib/cycle/draw.ts` currently says, in its own header: "Nothing is filtered by who is available
[...] That is the design, not an oversight." That comment is now wrong and should go with the fix.
Jada's reason for the change: you should never lose the restaurant you picked to a night you had
already ruled out.

Two things that stay as they were — a place two people added still holds two tickets, and duplicates
are still not merged.

## Open questions for whoever picks this up

- **What if narrowing empties the pool?** A tier with Picks, but none from anyone free that night,
  is a new case. Falling back to the full tier (better a place than no place) and closing with no
  Drawn Pick (the honest empty-tier path that already exists) are both defensible. Ask Jada.
- **Does the reroll re-narrow?** If the Admin has since moved the Chosen Date to another candidate
  date, the pool should follow the new date rather than the one the month closed on.
