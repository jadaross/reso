# 22 — Going and Can't make it on the ticket

**What's wrong:** "You're going" is a pressed toggle on first visit, because going is derived from
being free on the Chosen Date. Three of six personas tapped it to say they were going and were
removed, which fired "Booked for 7, now 4. Jada needs to tell them." There is no "can't make it"
anywhere. Who is going is a sentence ("Going: Jada, Lottie, …, plus Jada's and Lottie's guests")
that has to be read to notice who is missing, and "Picked by Jada" makes it sound as if Jada chose
the place.

**What to build:** The Dinner screen shows who is going as a row of name chips, one per Member,
with the viewer's own chip marked, a "+1" badge for a guest, and grey for anyone who hasn't
answered. Under it, two buttons: "Going" and "Can't make it", one of them lit by the viewer's state.
A Member's state is written out beside them ("You're going · Bringing someone?"). Nothing looks
pressed before the Member has acted.

Going stays derived from Availability on the Chosen Date, so the ticket and the calendar never
disagree. "Can't make it" removes that night from the Member's Availability. "Hasn't answered" is a
Member with no Availability recorded for the month; "can't" is one who answered but not that night.

**Blocked by:** nothing

**Status:** ready-for-agent

- [ ] The "Going:" sentence is replaced by name chips: filled = going, "+1" badge = bringing a guest, grey = hasn't answered, dashed = can't
- [ ] The viewer's own chip is visibly marked
- [ ] "Going" and "Can't make it" are two buttons; the lit one reflects the viewer's current state, and a Member who hasn't answered sees neither lit
- [ ] Tapping "Can't make it" removes the Chosen Date from the Member's Availability and the chip row, the headcount and "Table for" update at once
- [ ] Tapping "Going" adds the Chosen Date to their Availability; the plus-one control appears only when going
- [ ] Toggling going off clears the plus-one, or asks
- [ ] The ticket reads "Jada's ticket · Jada books" instead of "Picked by Jada" and "Jada picked it, so Jada books it."
- [ ] The headcount-changed line, where shown, says "you" to the booker on their own phone
- [ ] `lib/cycle/cycle.test.ts` covers going, can't, and not-answered for one Member
