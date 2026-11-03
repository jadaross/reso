# 28 — Places names its draw and its controls look like controls

**What's wrong:** Places never says which month its draw is for, so "1 of them are in this month's
draw" and the Dinner header's "Medium month" contradict each other on screen. A three-sentence
paragraph sits above the form. The tier on each row is a hidden select, "remove" is a grey word in
the meta line, "no address yet" is a button styled as text, and the Low/Medium/High count tiles look
like buttons and do nothing. "Adding…" sits for seconds with no feedback and a second tap adds a
duplicate.

**What to build:** A strip at the top says "December draw · £££ · 3 tickets in the hat · drawn Sun
22 Nov". The intro paragraph becomes the name field's placeholder ("Somewhere you fancy — only you
see it"). Each row has a visible tier pill that opens the tier choice, and "remove" and "add address"
as pills at the row's edge. The count tiles are plainly counts. The Add button disables while adding
and the new row appears at once.

**Blocked by:** 20 — One word for price

**Status:** ready-for-agent

- [ ] The strip names the open month, its tier in £ glyphs, the ticket count for that tier and the Close Day
- [ ] The intro paragraph is gone; the placeholder carries "only you see it"; "The same place added twice goes in twice" is gone
- [ ] Each row's tier is a pill ("££ ▾") that opens the three choices; changing it saves at once
- [ ] "remove" and "add address" / "paste a new link" are pill buttons at the row's right edge
- [ ] The inline "yes, remove it / keep" confirm is kept
- [ ] The count tiles have no button styling; the open month's tier tile is marked "in the draw"
- [ ] "Add it" disables while adding; the row appears without a reload; the grammar is "1 of them is"
- [ ] "Google links don't carry an address. You can add one." is replaced by the "add address" pill on that row
