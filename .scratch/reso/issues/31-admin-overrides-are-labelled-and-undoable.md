# 31 — Admin overrides are labelled and undoable

**What's wrong:** The Admin tier and date buttons look like a tally, not an override; nothing says
what the rota or the vote said. Pinning a Chosen Date cannot be undone: tapping the pinned date
again keeps it, there is no "let the vote decide", and Members see no sign a date is pinned. The
result message says "This month is now medium" while Dinner still says "Medium month" for a
different month. "Draw again" sits next to a grey "Table booked." that reads as a status, not a
warning.

**What to build:** Each override shows what it is overriding and can be cleared. Tier: "Rota says
£££ · Override" with the three glyphs, and "Back to the rota". Date: "Vote leads Sat 12 Dec · Pin a
night / Let the vote decide". Messages name the month. The Dates tab shows "Jada pinned Fri 4 Dec"
to everyone while a pin is in place. "Draw again" says the table is booked and what that means.

**Blocked by:** 20 — One word for price

**Status:** ready-for-agent

- [ ] The tier block reads "Rota says <tier>" (or "Vote said <tier>") with an override control and a "Back to the rota/vote" that clears the override flag
- [ ] The date block reads "Vote leads <night>" with "Pin a night" and "Let the vote decide"; tapping the pinned night again, or "Let the vote decide", clears the pin and recomputes the Chosen Date
- [ ] Every Admin confirmation names the month: "December is now £££", "December pinned to Fri 4 Dec"
- [ ] The Dates tab shows "<Admin> pinned <night>" above the open month while a pin exists
- [ ] "Draw again" reads "Draw again (the table is booked for Smoking Goat; you'll need to cancel it)" when booked
- [ ] The Admin intro sentence about the group link is removed
- [ ] Tests cover pin, un-pin, and recompute
