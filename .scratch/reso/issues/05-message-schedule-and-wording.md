# The reminder and announcement messages: when, to whom, and what they say

Type: grilling
Status: resolved
Blocked by: — (03 resolved)

## Question

Decide the full message calendar for one Outing and the wording of each message. Candidates: 1st of the prior month "tap your dates for <Month>" (push to all + WhatsApp share); 8th "last call, N of M in"; 15th Close Day announcement "<Month>'s dinner: <place>, <weekday date>, N going + P plus-ones" (push + share); day before the dinner reminder; day after "rate it". For each: push, WhatsApp share, both, or neither; who is nudged if the Admin hasn't shared yet; how the draft appears in the app. Depends on what push can do on iOS (ticket 03). Run `/grilling` with Jada.

## Answer

Derived from decisions already settled while charting (push to every Member who allows it, WhatsApp
as a share the Admin forwards, daily cron on Hobby with up to an hour of drift) plus drafted
wording. **The schedule is settled; the wording is a draft for Jada to overwrite** — it is the one
part of this ticket that is pure taste and it costs nothing to change later.

Dates below are for an Outing in month M, so Close Day is the 15th of M−1.

| When | Who gets it | Channel | Draft |
| --- | --- | --- | --- |
| 1st of M−1 | every Member | push | "October's open. Tap the evenings you can do." |
| 8th of M−1 | only Members with no Availability recorded | push | "5 of 8 are in for October. Yours are still blank — it closes in a week." |
| 15th of M−1, after the Draw | every Member | push | "October: Mangal 2 in Dalston, Friday the 16th. 8 of us." |
| 15th of M−1, after the Draw | the Admin | in-app share | the announcement text, with a Send button |
| 16th of M−1, if nothing was shared | the Admin only | push | "October's dinner is settled but the group hasn't been told." |
| day before the dinner | Members attending | push | "Mangal 2 tonight, 8pm. 8 of us." |
| day after the dinner | Members attending | push | "How was Mangal 2?" |

**The WhatsApp text is one message, not a thread.** Place, area, weekday and date, headcount, and
the fact it still needs booking. No link to the site: everyone already has it on their Home Screen,
and a link in a group chat invites the wrong person to open it.

**Rules that outlast the wording.**

- A message is sent at most once per Outing per kind. `sent_messages` already records this, so a
  double-firing cron cannot double-send.
- The 8th nudge goes only to the silent. Nagging people who have already answered is how a group
  app gets muted.
- Push failures are not retried and never block the cycle. A dead subscription is deleted on a
  404 or 410 and the Member simply sees the state next time they open the app.
- Nothing is ever sent to the group automatically. Every outbound message to WhatsApp passes
  through a human tap, which is a property of the platform, not a limitation to design around.
- Cron drift is acceptable everywhere here. No message in this table is time-critical to the hour;
  the day-before reminder is the closest and an hour either side of a morning send is fine. This
  closes the fog item asking whether Vercel Workflows' sleep was needed. It is not.
