# 13 — The reveal and the share

**What to build:** On Close Day the month home stops being a calendar and becomes the announcement:
the restaurant, the date, how many are coming, and the fact that nobody has booked it. The Admin
gets a written message and sends it to the group chat in two taps.

**Blocked by:** 08, 11, 12

**Status:** done

- [x] An announced Outing renders the ticket: place, area, address, weekday and date, headcount including Plus-ones
- [x] It says why the place won when it had more than one ticket in the draw
- [x] It says plainly that the table is not booked yet
- [x] The announcement text is composed server-side, in one module, so that push and share can never disagree
- [x] The Share button calls `navigator.share` from the user's own tap, and falls back to copying the text where the API is missing
- [x] The Share button is offered to the Admin; every Member can still see the text
- [x] An Outing that closed with no Drawn Pick, because its tier held no Picks, says so and tells the Admin what to do rather than rendering an empty ticket

## Done

Exercised locally by running the real Close Day path against the local database with all six
Members' Availability, three Picks in the Low tier and two Plus-ones. October closed on Friday the
16th, the Draw landed, and the reveal rendered the ticket with the tear line and notches, the
headcount of eight, "Booked: Not yet", who is going, and how many tickets the tier held.

The share was verified by stubbing `navigator.share` and pressing the button. It hands over exactly:
"October: Brat — Friday 16 October. 8 of us, including 2 guests. Still needs booking."

Two things beyond the ticket. The month heading was dropped from this screen: the ticket already
carries the month, and printing it twice above its own stamp is the sort of repetition that makes a
screen feel generated. And attendance is now written at Close Day, which belongs to ticket 14 but
had to come first — without it the headcount on the ticket counted guests against nobody.
