# 11 — The availability calendar

**What to build:** The screen the group actually uses. A Member opens Reso, sees next month, taps
the evenings they can do, and sees how many others can do each day as they choose. They can say
they are bringing a guest. They can change any of it until Close Day.

**Blocked by:** 08

**Status:** ready-for-agent

The month home is phase-aware: while the Outing is open it is this calendar. The announced and done
phases arrive in ticket 13 and 14 — leave a clear seam for them rather than a placeholder.

- [ ] The grid shows the Outing's month, Monday first, with the correct leading blanks
- [ ] One tap toggles a whole day; there is no time picker and no partial state
- [ ] The Member's own days are filled in the accent colour
- [ ] Each day carries a density bar showing how many Members are free, so consensus is visible while it forms
- [ ] The screen says how many Members have recorded nothing yet
- [ ] A Plus-one toggle sets the flag for this Outing only
- [ ] Availability can be changed until the Outing closes, and cannot be changed after
- [ ] Every tap persists immediately; nothing is lost by closing the app
- [ ] The current leader is stated in words, matching the Chosen Date rule including its weekend tie-break
