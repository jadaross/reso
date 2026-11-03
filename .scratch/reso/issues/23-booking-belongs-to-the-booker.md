# 23 — Booking belongs to the booker

**What's wrong:** "I've booked it" is a full-width button for every Member, and "not booked after
all" is a link every Member can tap; a non-booker can un-book the table with one tap and there is
no gate in the code. Booking asks nothing (no time, no headcount), so the ticket, the share text and
the reminders have nothing to say about when. There is no deadline for booking. Once the headcount
drifts after booking, "Booked for 7, now 6. Jada needs to tell them." sits on screen forever with no
way to say it has been done.

**What to build:** Booking is the booker's job and looks like it. The booker (the Member whose Pick
was drawn, or an Admin) sees "I've booked it"; it opens a small sheet with the time (default 19:30)
and the table size (prefilled from the headcount). The ticket then reads "Booked · 7:30 · 7". Before
booking, the ticket shows a "Book by" date. Only the booker can un-book. When the headcount moves
after booking, the booker sees "Booked for 7, now 6 · Told the restaurant" and tapping it clears the
line and resets the booked-for count; everyone else sees only "Booked · 7:30 · 7".

**Blocked by:** 22 — Going and Can't make it on the ticket

**Status:** ready-for-agent

- [ ] Only the booker or an Admin sees "I've booked it" and "not booked after all"; a non-booker's screen has no booking controls
- [ ] "I've booked it" opens a sheet: time (default 19:30) and table for N (prefilled); the Outing stores both
- [ ] The ticket's Booked cell reads "Not yet" before, and "7:30 · 7 · Jada" (or similar, one row) after
- [ ] The unbooked ticket shows a "Book by" date, derived from the Chosen Date
- [ ] Headcount drift after booking shows the booker one line with a "Told the restaurant" action that clears it and updates the booked-for count; it addresses the booker as "you"
- [ ] The booker gets the existing push when the headcount drifts; nothing else changes about push
- [ ] A migration adds the booked time and a "told" marker; `pnpm build` applies it
- [ ] Tests cover: non-booker cannot book or un-book; drift line appears and clears
