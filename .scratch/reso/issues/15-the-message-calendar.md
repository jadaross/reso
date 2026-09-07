# 15 — The message calendar

**What to build:** The group stops needing to remember Reso exists. It tells them when a month
opens, nudges only the people who have not answered, announces the result, reminds them the day
before, and asks for a rating the day after.

**Blocked by:** 09, 13

**Status:** ready-for-agent

The schedule and the draft wording are in ticket 05. The wording lives in one module because Jada
is expected to rewrite it once she sees it in situ.

- [ ] All five Member-facing pushes fire on the right days, to the right people, with the wording from ticket 05
- [ ] The week-before nudge goes only to Members who have recorded no Availability
- [ ] The Admin is nudged, and only the Admin, if the announcement has not been shared the day after Close Day
- [ ] Each message kind is sent at most once per Outing, enforced through `sent_messages`, so a double-firing cron cannot double-send
- [ ] A push that fails with 404 or 410 deletes that subscription and does not retry
- [ ] A failing push never prevents the cycle from advancing
- [ ] Covered by integration tests through the cron seam, including the double-fire case
