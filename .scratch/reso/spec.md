# Reso — v1 spec

Status: ready-for-agent
Source: the [wayfinder map](./map.md) and its seven decision tickets. Vocabulary is
[`CONTEXT.md`](../../CONTEXT.md) and is used exactly, here and in the code.

## Problem Statement

A group of friends in London keeps meaning to go for dinner and keeps not going. Picking a
restaurant is a group chat that dies. Finding a night everyone can do is a worse one. The
places anyone actually wants to try are scattered across screenshots and saved pins that nobody
else can see, and the same three restaurants get suggested every time because they are the ones
people remember.

## Solution

One private site the group opens from their phones, once or twice a month.

Anyone can add a restaurant whenever they think of one, and say roughly what it costs. Each month
the site asks everyone which evenings they are free, picks the night that suits the most people,
and draws a restaurant at random from the list. Adding a place is a vote: if two people want the
same restaurant, it is in the draw twice.

Months rotate through cheap, middling and expensive, so the group is not always eating the same
way. On the 15th of the month before, the site locks availability, announces the date and the
place, and hands one person a message to forward to the group chat. Someone books the table. After
the dinner everyone rates it.

## User Stories

1. As a Member, I want to open one link from the group chat and pick my name from a list, so that I am in without a password.
2. As a Member, I want to add the site to my Home Screen and have it look like an app, so that I remember it exists.
3. As a Member, I want the site to remember who I am on this phone indefinitely, so that I never pick my name twice.
4. As a Member who picked the wrong name, I want to switch in one tap, so that a fat-fingered tap is not permanent.
5. As a Member with a phone and an iPad, I want to use both, so that identity is per device rather than an exclusive claim.
6. As a Member, I want to see my own name on screen at all times, so that I notice immediately if I am signed in as someone else.
7. As a Member, I want to tap the evenings I am free on a calendar of next month, so that giving my availability takes fifteen seconds.
8. As a Member, I want one tap to toggle a whole evening, so that I am never asked what time.
9. As a Member, I want to see how many of the group are free on each day while I choose, so that I can see the consensus forming and shift my own answer toward it.
10. As a Member, I want to see how many people have not answered yet, so that I know whether to chase anyone.
11. As a Member, I want to change my availability until Close Day, so that plans that change are not stuck.
12. As a Member, I want to say I am bringing a guest for a given month, so that the table is booked for the right number.
13. As a Member, I want to add a restaurant by typing its name, so that adding one is never blocked on having a link.
14. As a Member, I want to paste an Apple or Google Maps link and have the name and address filled in, so that adding a place I just looked up is one paste.
15. As a Member, I want a pasted link that cannot be read to still save with my typed name, so that a failed paste never loses the restaurant.
16. As a Member, I want to say whether a restaurant is cheap, middling or expensive when I add it, so that it lands in the right kind of month.
17. As a Member, I want to correct another Member's price tier, so that one person's guess is not permanent.
18. As a Member, I want to add a restaurant that someone else already added, so that wanting it twice makes it twice as likely.
19. As a Member, I want to see how many restaurants are on the list and how they split across the three tiers, so that I know whether the pool is healthy without seeing what is in it.
20. As a Member, I want to see the places I added myself, so that I do not add the same one twice by accident.
21. As a Member, I want everyone else's suggestions hidden from me, so that the draw is a surprise and nobody is judged for what they put in.
22. As the Admin, I want to see the whole list with who added what, so that somebody can fix a wrong tier or a missing address.
23. As a Member, I want to be told when a new month opens for availability, so that I do not have to remember.
24. As a Member who has not filled anything in, I want a single nudge a week before Close Day, so that I am reminded once and not nagged.
25. As a Member who has already answered, I want to not get the nudge, so that the app does not train me to ignore it.
26. As a Member, I want to be told the date and the restaurant the moment they are settled, so that I can put it in my calendar.
27. As a Member, I want to be reminded the day before the dinner, so that I turn up.
28. As a Member, I want to be asked to rate the place the day after, so that the history is worth having.
29. As a Member, I want to rate a Visit out of five and leave a short note, so that we remember which ones were worth repeating.
30. As a Member, I want to see the history of where we have been and how it scored, so that the group has a record.
31. As a Member, I want to know the table is not booked yet, so that nobody assumes someone else did it.
32. As the Admin, I want a message written for me that I forward to WhatsApp in two taps, so that telling the group costs nothing.
33. As the Admin, I want to be nudged if I have not forwarded the announcement, so that a decided month does not go untold.
34. As the Admin, I want to add a Member by typing their name, so that new friends can join.
35. As the Admin, I want to see which added names have never been opened, so that I can chase people before Close Day.
36. As the Admin, I want to archive a Member who has left, so that they stop counting toward availability without erasing them from past Visits.
37. As the Admin, I want to unlock admin actions with a PIN, so that a friend cannot casually reroll the draw or remove someone.
38. As the Admin, I want the unlock to last a month on my phone, so that I am not typing a PIN constantly.
39. As the Admin, I want to override this month's price tier, so that a birthday can be an expensive month out of turn.
40. As the Admin, I want to see the top few dates and pick a different one, so that the arithmetic does not overrule something I know.
41. As the Admin, I want to redraw once when the drawn place is shut or unbookable, so that a dead pick does not kill the month.
42. As a Member, I want a reroll to be visible in the month's history, so that nobody quietly re-rolls until they get what they want.
43. As the Admin, I want to close availability early once everyone is in, so that we do not wait until the 15th unnecessarily.
44. As the Admin, I want to be told when the month's tier has no restaurants in it, so that I can add one or change the tier.
45. As the Admin, I want to rotate the Group Link if it leaks, so that people who already installed the app are unaffected.
46. As a Member, I want the site to be legible in bright daylight on a phone, so that it works when I am outside.
47. As a Member, I want the site to cost nobody anything to run, so that it survives indefinitely.

## Implementation Decisions

**What already exists.** The data model, the Group Link and per-Device identity, the Admin PIN,
tier rotation, Chosen Date computation, the Draw, Maps link parsing, the installable web app,
Web Push plumbing, and the daily cron that opens, closes and completes Outings. These are built and
covered by unit tests. This spec is the remaining work: every screen, the message sending, and the
setup that puts it in front of the group.

**Design direction** is decision A from the prototype, recorded in
[ticket 06](./issues/06-look-and-feel-prototype.md): a bone card with a tear line and punched
notches on a near-black field, one amber accent, Bricolage Grotesque over Inter Tight. The tokens
become CSS custom properties defined once and consumed everywhere; no variant keeps its own
palette. B's per-day density bar is folded into the availability calendar so consensus is visible
while it forms. `app/prototype/look/` is the reference and is deleted once the direction is folded
in.

**The screen set.** Six surfaces, all under `/g/<secret>`: the name pick, the month home (which is
phase-aware and is the availability calendar while the Outing is open and the announcement once it
is announced), the restaurant list with its add form, the Visit rating, the history, and the Admin
panel. The month home is the root; the others hang off it.

**Phase drives the home screen.** An Outing's `status` already distinguishes open, announced and
done. Open renders the calendar and the density bars. Announced renders the ticket, the Share
button, and the fact that nobody has booked. Done renders the rating prompt until this Member has
rated, then the result.

**The share is `navigator.share`,** called from a real user gesture, falling back to copy-to-
clipboard where the API is missing. The composed text lives server-side so that push and share
never disagree. Nothing is ever posted to WhatsApp programmatically; this is a platform fact, not
a limitation to design around.

**Messages** follow the calendar settled in [ticket 05](./issues/05-message-schedule-and-wording.md):
five push moments plus one Admin share, the week-before nudge going only to Members who have
recorded nothing. Sending moves into the existing daily cron route, which is already idempotent and
already writes `sent_messages`; that table is the guard against a double-firing cron sending twice.
Push failures delete dead subscriptions on 404 and 410 and never block the cycle.

**Attendance is derived, not asked.** Whoever is available on the Chosen Date is going, plus their
Plus-ones. The `attendance` table is written at Close Day from Availability so that later edits to
Availability cannot silently rewrite who came. The Admin can correct it from the Admin panel until
the Visit is rated. This closes the open question on the map.

**The pool of restaurants is hidden from everyone but the Admin.** Members see how many places
are on the list and how those split across Low, Medium and High, plus their own Picks in full —
their own, so that nobody adds the same place twice by accident and quietly gives themselves two
tickets. Everyone else's suggestions stay invisible until the Draw names one. The Admin sees the
whole list, behind the PIN, because somebody has to be able to fix a wrong tier or a missing
address. A consequence worth stating: correcting another Member's tier is an Admin job now, not
everyone's.

**A Google-sourced Pick with no address** saves with the name, the area if the link gave one, and a
quiet "no address yet" marker; any Member can fill the address in later by editing the Pick. The
site never blocks an add on a failed lookup. This closes the second open question on the map.

**An Outing whose tier holds no Picks** closes with a Chosen Date and no Drawn Pick, and pushes the
Admin a message saying so. It does not fall through to another tier: a Low month silently becoming
a High one is a worse surprise than an empty month. This closes the third open question on the map.

**No new dependencies** beyond what is installed. Fonts are self-hosted through `next/font` rather
than a Google Fonts link, so the installed app renders correctly with no network.

## Testing Decisions

**A good test here asserts on behaviour a Member could describe.** "The night six people can do
wins over the night five can do" is a test; "computeChosenDate calls sortBy" is not. No test
reaches into a module's internals, and no test asserts on markup structure.

**Two seams, and only two.**

The first already exists and is where most value stays: pure functions in `lib/cycle/` and
`lib/maps/`, tested directly with no database. Tier rotation, Chosen Date and its tie-breaks, the
Draw's ticket arithmetic, and link parsing all live here. Prior art is `lib/cycle/cycle.test.ts`
and `lib/maps/maps.test.ts` — new tests match their shape.

The second is new: **the daily cron route, exercised end to end against a real Postgres.** It is
the highest seam in the system — one HTTP call drives opening, closing, drawing, and every message
— and it is where the bugs that would actually hurt live: a double-firing cron sending two
announcements, an Outing closing twice, a message going to the wrong people. Tests seed a database,
call the route with the cron secret, and assert on what changed and who was messaged, with push
sending stubbed at the module boundary.

That database is a Neon branch, created and dropped by the test run, on the same free plan the app
uses. It is not run in CI: this is a hobby project with one contributor and CI is not free time.
The command is `pnpm test:integration` and it is run before deploying.

**Server actions and screens get no tests of their own.** They are thin: a screen reads and renders,
an action validates and writes. Their logic belongs in the pure seam, and testing them would mean
testing React. If an action grows a real rule, that rule moves down into `lib/` where it can be
tested.

## Out of Scope

Everything the map already ruled out stays out: more than one Group, bulk restaurant import, paid
Places lookups for price and cuisine, and email, Telegram, Discord or SMS delivery. Beyond those:

- Booking the restaurant. The site never contacts a restaurant; a human books the table.
- Splitting the bill, tracking who paid, or any money movement.
- Editing the tier rotation order or the Close Day. Both are constants.
- Ratings that do anything. They are a record, not an input to the Draw.
- Anyone outside the Group seeing anything. There is no public page and no sharing of the history.

## Further Notes

The one thing in this spec that has not been through a human is the message wording in ticket 05.
The schedule is settled; the words are a first draft and are expected to be rewritten by Jada once
seen in situ. They are deliberately kept in a single module so that rewriting them touches one file.

The design direction was chosen by the agent under Jada's standing delegation rather than picked
from the prototype by hand. If it turns out to be wrong, the prototype's other two directions are
still in the tree and the token layer means the swap is small.
