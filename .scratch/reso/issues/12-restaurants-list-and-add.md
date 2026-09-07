# 12 — Restaurants: the list and adding one

**What to build:** Any Member can add a restaurant whenever they think of one, by typing a name or
pasting a Maps link, and can see the whole list split into what is in this month's draw and what is
waiting for a dearer month.

**Blocked by:** 08

**Status:** done

The Maps parser exists and is tested. This ticket uses it; it does not change it.

- [x] Adding by typed name alone works and is never blocked on a link
- [x] Pasting an Apple Maps link fills in name, address and coordinates
- [x] Pasting a Google Maps link fills in name and coordinates, and the Pick shows a quiet "no address yet" marker rather than an error
- [x] A link that cannot be parsed still saves the Pick with the typed name and keeps the raw link for a later retry
- [x] The adder chooses the Price Tier; any Member can change it afterwards
- [x] Any Member can fill in a missing address later
- [x] Adding a restaurant someone else already added creates a second Pick and the list says two people want it
- [x] The list is grouped into this month's tier and the rest, with the rest visibly waiting
- [x] Each Pick shows who added it

## Done

Exercised against the local database with the real roster. A real Apple Maps link pasted into the
form filled in the name and address; a Pick with no address had one typed in and saved; Brat was
moved from Medium to Low from the list and landed in the other section on reload.

One decision the ticket did not settle. Two Picks for the same restaurant stay two rows in the
database, because each is a ticket in the Draw and that is the whole voting mechanism — but they
render as **one row** naming everyone who wants it and stating how many tickets it holds. Two
identical rows on screen read as a bug rather than as a vote. Editing the tier or the address from
that row updates every Pick behind it, so a restaurant cannot end up split across two tiers.

The tier control is a native `select` sitting invisibly over the £ badge, so a phone shows its own
picker rather than a bespoke one.
