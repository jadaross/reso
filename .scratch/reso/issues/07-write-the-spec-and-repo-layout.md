# Write the v1 spec and repo layout

Type: grilling
Status: resolved
Blocked by: 01, 02, 03, 04, 05, 06

## Question

This is the destination. With every other ticket closed, write `.scratch/reso/spec.md`: the data model (Members, Picks, Outings, Availability, Visits, Ratings, push subscriptions, Admin state), the cycle rules as an explicit state machine with the cron's daily job, every screen from the prototype, the messages from ticket 05, the identity rules from ticket 04, and the repo layout for Next.js App Router + Drizzle + the chosen Postgres + Tailwind/shadcn + PWA/push, sliced into buildable issues. Graduate the remaining fog in the map (empty tier, attendance confirmation, date change after announcement, cron drift) into decisions here. Review it with Jada via `/grilling`; use `/codebase-design` for the module boundaries. Close the map when Jada signs off.

## Answer

**The spec is `.scratch/reso/spec.md`; the build tickets are 08 to 17 in this directory.**

The repo-layout half of this ticket was answered in code before the ticket ran, and is documented
in `README.md` under Layout. Rather than restate it, the spec takes it as given and covers only
what remains: the screens, the message sending, the second test seam, and going live.

**Three fog items were graduated into decisions here rather than into new tickets**, because each
was a single choice rather than an investigation:

- A Pick from a Google link, which carries no address, saves anyway with a "no address yet" marker
  that any Member can fill in. An add is never blocked on a lookup.
- An Outing whose tier holds no Picks closes with a Chosen Date and no Drawn Pick, and tells the
  Admin. It does not fall through to another tier — a Low month silently becoming a High one is a
  worse surprise than an empty one.
- Attendance is written at Close Day from Availability, so later edits cannot rewrite who came, and
  the Admin can correct it until the Visit is rated. This also settles what archiving a Member after
  Close Day does: their history stays, their future availability goes.

**One decision in the spec is the agent's, not Jada's:** the two test seams, and specifically that
integration tests run against a Neon branch locally and not in CI. Flagged in the spec.
