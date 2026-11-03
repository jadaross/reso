# 24 — Dinner's doors: the ask above the fold

**What's wrong:** The one thing the app wants from most Members, their dates for next month, is a
card below the fold, under the rating stars for a dinner they may not have attended. The Month Vote
is a four-sentence block at the very bottom ("Nobody has voted. The rota says cheap. Counted Tue 1
Dec. You haven't voted."), collapses itself the moment you vote, and never says what a tie does.
"Drawn from 5 tickets." is a dead sentence under the ticket that nobody could reconcile with the
Places counts.

**What to build:** Directly under the ticket's controls sits one strip for the open month:
"December · £££ month · tap your free nights by Sun 22 Nov" with a "0 tapped" chip, and tapping it
lands on December on the Dates tab. The vote is a door like the others ("January · 2 votes · counted
1 Dec"), opens to the four buttons with a one-line tie rule, and stays open after voting. "Drawn from
5 tickets" becomes a line that expands to list the five, since the surprise is over.

**Blocked by:** 20 — One word for price

**Status:** done

- [x] The open month's strip is the first thing under the ticket controls and is visible without scrolling on a 390×844 viewport
- [x] The strip's chip shows "N tapped" and tapping the strip opens the Dates tab scrolled to that month (works with 26 when it lands; until then, the top of Dates)
- [x] The Month Vote is a door with "<Month> · N votes · counted <date>"; it opens inline and does not collapse after a vote
- [x] The open vote says in one line what happens on a tie (rota breaks a tie it is in; otherwise drawn)
- [x] "Drawn from N tickets" expands to the N Pick names and who holds each
- [x] The Places and Past doors remain, in that order, after the strip
- [x] The install nudge card at the bottom of Dinner is unchanged by this ticket (30 handles it)
