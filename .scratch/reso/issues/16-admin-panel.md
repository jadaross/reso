# 16 — The Admin panel

**What to build:** Everything only Jada should be able to do, behind the PIN: managing who is in the
group, and overruling the month when real life disagrees with the arithmetic.

**Blocked by:** 08, 11, 12

**Status:** done

PIN hashing and the unlock cookie already exist. This is the screen and the actions.

- [x] Entering the PIN unlocks admin actions on that device for 30 days, sliding on each use
- [x] Adding a Member is typing a name; the name then waits, visibly marked as never opened, until a device claims it
- [x] Archiving a Member removes them from the roster and from availability on the open Outing, and leaves their Picks in the pool and their history intact
- [x] The month's Price Tier can be overridden, and the override is visible
- [x] The top three candidate dates are shown and the Chosen Date can be set to another of them
- [x] The draw can be rerolled exactly once, and the reroll is visible to everyone in the month's history
- [x] Availability can be closed early, running the same close path as Close Day
- [x] The panel warns when the open Outing's tier holds no Picks
- [x] The Group Link can be rotated, and the screen states that already-installed devices keep working

## Done

Exercised locally with the PIN. Adding Rowan worked and the name appeared marked "not opened yet";
adding Lottie a second time was refused with "Lottie is already in the group."; the redraw moved the
month from Brat to Mangal 2 and recorded it as a reroll, after which the button is gone.

Three decisions worth keeping.

**Adding someone is only typing a name.** Nothing is sent, no account is made. The name waits,
visibly unopened, until one of their Devices taps it — which is the same identity model as everyone
else and needs no invite flow at all.

**Re-adding an archived name brings that person back** rather than creating a second person with the
same name, so an accidental removal is undone by typing the name again.

**Closing early runs `closeDueOutings` with a far-future date** rather than reimplementing the close.
A second copy of Close Day would eventually disagree with the cron's copy about tie-breaks or
attendance.

Attendance correction after the fact, which ticket 14 handed over, is covered by the date override:
changing the Chosen Date on a closed Outing rebuilds who is going from Availability on the new day.
A free-form attendance editor was not built — nobody asked for one and the date override covers the
case that actually happens.
