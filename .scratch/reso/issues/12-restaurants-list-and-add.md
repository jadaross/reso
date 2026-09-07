# 12 — Restaurants: the list and adding one

**What to build:** Any Member can add a restaurant whenever they think of one, by typing a name or
pasting a Maps link, and can see the whole list split into what is in this month's draw and what is
waiting for a dearer month.

**Blocked by:** 08

**Status:** ready-for-agent

The Maps parser exists and is tested. This ticket uses it; it does not change it.

- [ ] Adding by typed name alone works and is never blocked on a link
- [ ] Pasting an Apple Maps link fills in name, address and coordinates
- [ ] Pasting a Google Maps link fills in name and coordinates, and the Pick shows a quiet "no address yet" marker rather than an error
- [ ] A link that cannot be parsed still saves the Pick with the typed name and keeps the raw link for a later retry
- [ ] The adder chooses the Price Tier; any Member can change it afterwards
- [ ] Any Member can fill in a missing address later
- [ ] Adding a restaurant someone else already added creates a second Pick and the list says two people want it
- [ ] The list is grouped into this month's tier and the rest, with the rest visibly waiting
- [ ] Each Pick shows who added it
