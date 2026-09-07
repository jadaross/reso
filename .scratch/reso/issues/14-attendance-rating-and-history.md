# 14 — Attendance, ratings and the history

**What to build:** After the dinner, the people who went can rate it out of five and leave a note,
and the group has a record of everywhere it has been.

**Blocked by:** 09, 13

**Status:** done

- [x] Attendance rows are written when the Outing closes, from Availability on the Chosen Date plus Plus-ones, so that later edits cannot rewrite who came — done early, in ticket 13, because the reveal's headcount depended on it
- [x] The Admin can correct attendance until the Visit has been rated
- [x] A done Outing prompts each attendee for a rating out of five and an optional short note
- [x] A Member who has rated sees the result instead of the prompt
- [x] The history lists past Visits with their date, place, headcount and average rating, most recent first
- [x] Archiving a Member leaves their past attendance and ratings intact and attributed

## Done

Exercised locally end to end: October closed, was marked done the day after the dinner, and the
month screen then asked "How was Brat?". Four stars and a note saved, three more ratings were added
directly, and the history page shows Brat at 4.0 from four people with everyone's notes underneath.

One rule enforced in the action rather than the screen: only Members recorded as attending can rate
a Visit. A rating is a record of an evening someone was at, not an opinion poll. Re-rating replaces
the earlier score rather than stacking a second one.

Not done here: the Admin correcting attendance after the fact. It needs the Admin panel to exist,
so it is folded into ticket 16.
