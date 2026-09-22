# 19 — Say whose guest it is

**What's wrong:** The reveal and the shared message say "+1 guest" and nothing else. Nobody can tell
who is bringing them, so the group finds out at the table.

**What to build:** Every guest on the announcement is attributed to the Member bringing them.

**Blocked by:** nothing

**Status:** open

- [ ] The reveal's going-list names the host of each guest, e.g. "Going: Ada, Lottie, Rowan, plus Lottie's guest"
- [ ] The announcement text — the same one that goes to push and the WhatsApp share — attributes guests the same way
- [ ] The dinner-party ticket attributes guests too, not only the restaurant ticket
- [ ] The headcount still adds up, whatever the wording
- [ ] `lib/cycle/cycle.test.ts` covers one guest, several guests, and none

## Where it is

The name is in the database and thrown away on the way out. `plus_ones` is keyed by
`(outingId, memberId)` — `lib/db/schema.ts:252` — but `loadReveal` reduces those rows to a number:

```
plusOnes: plusOneRows.length,    // lib/cycle/month-view.ts:226
```

So `Reveal.plusOnes: number` is all the screen has, and it prints the only thing a number can print —
`app/g/[secret]/(app)/reveal.tsx:110` and `:186`. `lib/cycle/messages.ts:272` loses the names the
same way, and `announcementText` in `lib/cycle/announcement.ts:43` phrases the count.

The fix is to carry the names: `plusOnes` becomes the Members bringing a guest, not a tally, in
`Reveal`, in `AnnouncementFacts`, and in both readers. The count is then derived where it is needed.

## A second bug, found while reading this

`loadReveal` counts every `plus_ones` row for the Outing, while `going` comes from `attendance` —
who was actually free on the Chosen Date. So a Member who is not coming, but had ticked a guest,
still adds one to the headcount, and their guest has nobody to arrive with. Once guests are
attributed the mismatch becomes visible on the screen, which is reason enough to fix both together:
only count a guest whose host is in the going-list.

## Wording

Jada rewrites the messages herself under ticket 05, so the exact phrasing here is a draft. Keep it
in `lib/cycle/announcement.ts` with the rest, so push and the share can never disagree.
