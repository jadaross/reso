# 25 — Share for everyone, with the ask baked in

**What's wrong:** The share button is Admin-only, so Lottie, the Member most likely to nudge the
group, cannot share from the app; two personas had to read the source to learn it existed. Its label
is a sentence ("Share to the group chat, for anyone without notifications"). The text names whose
guest is whose, which nobody in the chat cares about, and has no time and no ask.

**What to build:** A "Share" button on the Dinner screen for every Member. The text it hands to the
share sheet is one WhatsApp-ready line: date, time, place and area, booked for N, and the ask with
the Group Link: "Sat 14 Nov, 7:30 · Smoking Goat, Shoreditch · booked for 7 · not on the list? tap
in: <link>". Before the table is booked, the line says "not booked yet" instead of the time.

**Blocked by:** 23 — Booking belongs to the booker (for the time)

**Status:** ready-for-agent

- [ ] Every Member sees a "Share" button under the ticket; the label is the one word
- [ ] The text includes date, booked time, place, area where known, "booked for N" or "not booked yet", and the Group Link
- [ ] Guest attribution is gone from the share text; the announcement that goes to push may keep it
- [ ] After tapping Share on a device without a share sheet, the text is copied and the button says "Copied"
- [ ] `lib/cycle/cycle.test.ts` covers the text before and after booking
