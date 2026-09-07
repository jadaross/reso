# 11 — The availability calendar

**What to build:** The screen the group actually uses. A Member opens Reso, sees next month, taps
the evenings they can do, and sees how many others can do each day as they choose. They can say
they are bringing a guest. They can change any of it until Close Day.

**Blocked by:** 08

**Status:** done

The month home is phase-aware: while the Outing is open it is this calendar. The announced and done
phases arrive in ticket 13 and 14 — leave a clear seam for them rather than a placeholder.

- [x] The grid shows the Outing's month, Monday first, with the correct leading blanks
- [x] One tap toggles a whole day; there is no time picker and no partial state
- [x] The Member's own days are filled in the accent colour
- [x] Each day carries a density bar showing how many Members are free, so consensus is visible while it forms
- [x] The screen says how many Members have recorded nothing yet
- [x] A Plus-one toggle sets the flag for this Outing only
- [x] Availability can be changed until the Outing closes, and cannot be changed after
- [x] Every tap persists immediately; nothing is lost by closing the app
- [x] The current leader is stated in words, matching the Chosen Date rule including its weekend tie-break

## Done

Verified against a local Postgres with all six Members' Availability in place: the 16th of October
fills to six of six, the density bars step up correctly, and the standing line reads "Friday 16
October leads with 6 of 6. Everyone has answered." — which is the Chosen Date rule's own answer,
not a second implementation of it.

`calendarGrid` went into `lib/cycle/dates.ts` with tests rather than into the component, so the
Monday-first layout and the month-boundary padding are covered by the pure seam.

One bug found and fixed during the ticket: the close date was being derived inline in the read model
instead of calling `closeDayFor`, so October's month screen announced that it closed on 15 October
rather than 15 September. Exactly the duplication the codebase's own comments warn about.

Not covered: the locked state after Close Day is implemented and typed but has not been exercised,
because no Outing has closed yet. Ticket 09's harness is where that gets a real test.
