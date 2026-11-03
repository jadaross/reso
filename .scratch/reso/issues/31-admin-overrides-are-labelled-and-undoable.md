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

**Status:** done

- [x] The tier block reads "Rota says <tier>" (or "Vote said <tier>") with an override control and a "Back to the rota/vote" that clears the override flag
- [x] The date block reads "Vote leads <night>" with "Pin a night" and "Let the vote decide"; tapping the pinned night again, or "Let the vote decide", clears the pin and recomputes the Chosen Date
- [x] Every Admin confirmation names the month: "December is now £££", "December pinned to Fri 4 Dec"
- [x] The Dates tab shows "<Admin> pinned <night>" above the open month while a pin exists
- [x] "Draw again" reads "Draw again (the table is booked for Smoking Goat; you'll need to cancel it)" when booked
- [x] The Admin intro sentence about the group link is removed
- [x] Tests cover pin, un-pin, and recompute

## Done

The tier block names the rota or the vote and the three glyphs (plus Dinner party) are the override. "Back to the rota" or "Back to the vote" clears `tierOverridden` and restores that decision. A vote is not itself an override: opening an Outing no longer sets the flag.

"Vote leads <night>" is the availability tally. "Pin a night" sets the Chosen Date; tapping that night again, or "Let the vote decide", clears it and the date is recomputed. Close Day keeps a pin. The Dates tab shows who pinned it, above that month, for every Member. The name is the Admin who pinned, stored on the Outing.

Confirmations name the month. When the table is booked, that warning is the Draw again button. The sentence under the Admin title is gone.
