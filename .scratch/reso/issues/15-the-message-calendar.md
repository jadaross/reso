# 15 — The message calendar

**What to build:** The group stops needing to remember Reso exists. It tells them when a month
opens, nudges only the people who have not answered, announces the result, reminds them the day
before, and asks for a rating the day after.

**Blocked by:** 09, 13

**Status:** done

The schedule and the draft wording are in ticket 05. The wording lives in one module because Jada
is expected to rewrite it once she sees it in situ.

- [x] All five Member-facing pushes fire on the right days, to the right people, with the wording from ticket 05
- [x] The week-before nudge goes only to Members who have recorded no Availability
- [x] The Admin is nudged, and only the Admin, if the announcement has not been shared the day after Close Day
- [x] Each message kind is sent at most once per Outing, enforced through `sent_messages`, so a double-firing cron cannot double-send
- [x] A push that fails with 404 or 410 deletes that subscription and does not retry
- [x] A failing push never prevents the cycle from advancing
- [x] Covered by integration tests through the cron seam, including the double-fire case

## Done

Walked a whole month through the calendar against the local database, firing `sendDueMessages` at
nine dates:

| Date | Sent |
| --- | --- |
| 1 Sep, month opens | opened |
| 2 Sep | nothing |
| 8 Sep, a week before Close Day | last-call |
| 9 Sep | nothing |
| 15 Sep, Close Day | announced |
| 16 Sep, not yet shared | admin-nudge |
| 16 Sep, after sharing | nothing |
| 15 Oct, eve of the dinner | day-before |
| 17 Oct, morning after | rate |
| 18 Oct | nothing |

Two things the ticket did not anticipate.

**The site cannot see into WhatsApp,** so there was no way to know whether the Admin had actually
forwarded the announcement, and the nudge would have fired at someone who had already done it.
Pressing Share now records a `shared` row, which is the only evidence available, and the nudge reads
it.

**The last-call date is derived from `closeDayFor`,** not restated as "the 8th". An earlier draft
computed it by string-slicing the month, which would have drifted the moment Close Day moved.

The claim in `sent_messages` is written *before* the push is sent. A crash between the two loses a
notification; the other order would send it twice on the next run, and a duplicate is much worse
than a miss.

## Changed after the fact

Jada asked for a couple more nudges "just to make sure people use it". Two were added, both once per
Outing like the rest:

- **stock-up**, from ten days before Close Day, to everyone, only when the month's tier holds fewer
  than three Picks. It names the shortage: "No cheap places on the list" or "Only 2 cheap places to
  draw from". Conditional rather than scheduled, so a healthy list never triggers it.
- **closing-soon**, two days before Close Day, to everyone: last chance to change your dates. This
  one goes to everybody, where last-call goes only to the silent — they answer different questions.

Eight messages now cover a month, and the walk-through confirms each fires exactly once on the right
day with silence in between.
