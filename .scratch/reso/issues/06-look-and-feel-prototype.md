# Look and feel: a throwaway prototype of the phone screens

Type: prototype
Status: resolved
Blocked by: —

## Question

Jada has no design preference beyond "not a default template" and "feels like an app on the home screen". Build a cheap, static, mobile-first prototype of the core screens for Jada to react to: pick-your-name entry; this month's home (phase-aware: tapping dates / announced / done); the availability calendar (one tap per day); the Picks list with tier badges and an add form; the announcement with Share button; the Visit rating screen; a minimal Admin panel. Use `/prototype` and the `frontend-design` skill. Record the chosen direction (typography, colour, layout language) as the answer; link the prototype.

## Prototype built

Three structurally different variants live at `app/prototype/look/`, on the throwaway route
`/prototype/look?variant=A|B|C&screen=name|dates|announced|picks`. Fixture data only; the route
touches no database and no server action. A floating bar switches variant and screen; arrow keys
work too (left/right for variant, up/down for screen).

- **A — Stub.** The Draw is a raffle, so the month's dinner is a physical ticket: bone card with a
  tear line and punched notches on a near-black field, amber accent. One hero object per screen.
  Type is Bricolage Grotesque over Inter Tight.
- **B — Planner.** The month grid is the app, persisting through every phase and simply filling in.
  Each day carries a density bar of how many Members are free; the Chosen Date turns solid
  ultramarine. Dense, no hero. IBM Plex Sans with tabular numerals.
- **C — Menu.** Borrowed from the thing itself. Centred, type-led, dot leaders instead of tables,
  numbers spelled out. Pale sage, bottle green, claret. Fraunces over Karla.

Awaiting Jada's pick. This ticket resolves with the chosen direction and the reasons, after which
the winner is rewritten properly into `app/g/[secret]` and the whole prototype directory moves to a
throwaway branch.

## Answer

**A — Stub is the direction, with B's density bars folded into its calendar.** Jada delegated the
aesthetic twice ("Whatever you want as a design") and approved the three directions without
separating them, so this is the agent's call, recorded here so it can be overturned cheaply.

**Why A.** The app is opened perhaps five times a month, and the reveal is the moment the whole
thing exists for. A holds one object per screen and spends its boldness there: a bone ticket with a
tear line and punched notches on a near-black field. It also survives the Home Screen test better
than the other two — a dark app icon and a dark first paint read as an app, where B's light chrome
reads as a website.

**Why B's density bars survive.** The recurring job is tapping dates, not the reveal, and B's one
genuine insight is that consensus should be visible while it forms: a small bar under each day
showing how many Members are free turns a private calendar into a group one. That idea is
independent of B's light palette and transplants into A's dark grid intact. Without it, A's
calendar shows only your own taps and hides the thing the Chosen Date is computed from.

**Why not B overall.** Its full-bleed grid is the right shape for the open phase and the wrong shape
for the other two: after Close Day the calendar is settled and keeping it as the page buries the
announcement below the fold.

**Why not C.** It is the best-looking of the three and the worst-behaved. A menu vernacular fights a
data grid, and spelling numbers out ("six of eight") is charming once and tiresome monthly.

**Tokens carried forward.** Field `#0E1116`; card and type `#EFEBE1`; accent `#F0A83C`; muted
`#7A8391`. Display face Bricolage Grotesque, text face Inter Tight. One accent colour, used for the
current selection and the primary action and nothing else. Retire C's Fraunces/Karla and B's
IBM Plex Sans.

**Copy voice, inherited from the prototype.** Second person, plain, no exclamation marks. Buttons
name their consequence ("Send it to the group", not "Share"). The reveal states the fact and then
who still has to act ("Someone still needs to book it").

**What happens to the prototype.** `app/prototype/look/` stays in the tree only as the build
reference and is deleted by the ticket that folds the direction into `app/g/[secret]`. It is not
production code: no tests, no error handling, fixture data.
