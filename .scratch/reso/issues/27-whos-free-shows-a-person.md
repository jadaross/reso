# 27 — Who's free shows a person and lets you say no

**What's wrong:** On Who's free, tapping a name hides that person; both personas who tried expected
to see only that person. The day popover ("Jack, Sienna · not Jada, Lottie, Scotty, You") lumps
"can't" with "hasn't said". There is no way to say "no night in December works", so a Member who
opened the app and decided counts as having ignored it.

**What to build:** A name chip shows that person's nights alone; "Everyone" resets. The day popover
splits "can't" from "hasn't said". A "None this month" chip beside the weekday letters records that
a Member answered no, and they then show as "can't" rather than "hasn't answered" everywhere.

**Blocked by:** 26 — Dates opens on the month that wants you

**Status:** ready-for-agent

- [ ] Tapping a name on Who's free shows only that Member's free nights; tapping another swaps; "Everyone" shows all
- [ ] The day popover reads "<free names> · can't: <names> · hasn't said: <names>"
- [ ] "None this month" is a chip on the open month; tapping it clears the Member's nights and records an answered-no; tapping a night afterwards un-sets it
- [ ] An answered-no Member appears as "can't" in the Dates chips, the popover and the Dinner chips, and never as "haven't answered"
- [ ] A migration adds the answered-no record; `pnpm build` applies it
- [ ] The Chosen Date and Draw treat an answered-no Member exactly like one with no free nights
- [ ] Tests cover answered-no versus not-answered
