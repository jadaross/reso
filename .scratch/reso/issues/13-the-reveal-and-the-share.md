# 13 — The reveal and the share

**What to build:** On Close Day the month home stops being a calendar and becomes the announcement:
the restaurant, the date, how many are coming, and the fact that nobody has booked it. The Admin
gets a written message and sends it to the group chat in two taps.

**Blocked by:** 08, 11, 12

**Status:** ready-for-agent

- [ ] An announced Outing renders the ticket: place, area, address, weekday and date, headcount including Plus-ones
- [ ] It says why the place won when it had more than one ticket in the draw
- [ ] It says plainly that the table is not booked yet
- [ ] The announcement text is composed server-side, in one module, so that push and share can never disagree
- [ ] The Share button calls `navigator.share` from the user's own tap, and falls back to copying the text where the API is missing
- [ ] The Share button is offered to the Admin; every Member can still see the text
- [ ] An Outing that closed with no Drawn Pick, because its tier held no Picks, says so and tells the Admin what to do rather than rendering an empty ticket
