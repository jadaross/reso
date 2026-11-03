# 33 — Admin can nudge the silent

**What's wrong:** To find who hasn't filled in next month's dates, the Admin scrolls the Dates tab
past two calendars to a grey sentence, then writes a WhatsApp by hand. There is no "nudge" control;
the only outbound thing is the free-text "Tell everyone", which goes to nobody until phones allow
notifications.

**What to build:** A block at the top of Admin: "December dates: Lottie, Scotty, Sophie haven't
answered" with "Nudge them". Tapping it pushes a prewritten reminder to those Members' phones and
offers the same text to share to the chat ("Tap your December nights by Sun 22 Nov: <link>").

**Blocked by:** 31 — Admin overrides are labelled and undoable

**Status:** ready-for-agent

- [ ] The block lists exactly the Members with no Availability and no answered-no for the open month; it disappears when everyone has answered
- [ ] "Nudge them" sends one push to those Members only, with the month, the Close Day and the Group Link
- [ ] After sending, the block offers "Share the reminder" with the same text for the chat
- [ ] The reminder is recorded so a second tap the same day says "Nudged today" rather than sending again
- [ ] The wording lives in `lib/cycle/messages.ts` beside the other messages
