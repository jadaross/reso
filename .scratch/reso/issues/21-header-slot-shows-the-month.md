# 21 — Header slot shows the month on every tab

**What's wrong:** The top-right slot of the shell changes meaning per tab: "Medium month" on Dinner,
"Sun 22 Nov close" on Dates (reads as a verb), "8 places" on Places, "1 dinner" on Past, and
"Admin · Admin" on Admin, where the page name fills the month slot. Nothing in the bar tells a Member
which month the app is talking about.

**What to build:** The slot shows the current Outing's month and Price Tier the same way on every
tab, e.g. "Nov · ££", with the Admin link beside it for Admins. Each tab's own count or deadline moves
into that tab's headline where it belongs.

**Blocked by:** 20 — One word for price

**Status:** ready-for-agent

- [ ] Dinner, Dates, Places, Past and Admin all show "<Mon> · <tier>" top-right, and nothing else in that slot but the Admin link
- [ ] The Admin page no longer reads "Admin · Admin"
- [ ] The Dates deadline reads "closes Sun 22 Nov" inside the Dates screen, not in the header slot
- [ ] The Places count and the Past count live in their own screens' headlines
- [ ] When the current Outing is a Dinner Party the slot says "Nov · dinner party"
