# 16 — The Admin panel

**What to build:** Everything only Jada should be able to do, behind the PIN: managing who is in the
group, and overruling the month when real life disagrees with the arithmetic.

**Blocked by:** 08, 11, 12

**Status:** ready-for-agent

PIN hashing and the unlock cookie already exist. This is the screen and the actions.

- [ ] Entering the PIN unlocks admin actions on that device for 30 days, sliding on each use
- [ ] Adding a Member is typing a name; the name then waits, visibly marked as never opened, until a device claims it
- [ ] Archiving a Member removes them from the roster and from availability on the open Outing, and leaves their Picks in the pool and their history intact
- [ ] The month's Price Tier can be overridden, and the override is visible
- [ ] The top three candidate dates are shown and the Chosen Date can be set to another of them
- [ ] The draw can be rerolled exactly once, and the reroll is visible to everyone in the month's history
- [ ] Availability can be closed early, running the same close path as Close Day
- [ ] The panel warns when the open Outing's tier holds no Picks
- [ ] The Group Link can be rotated, and the screen states that already-installed devices keep working
