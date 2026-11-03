# 29 — Places keeps the link

**What's wrong:** A pasted Apple or Google Maps link is parsed for the address and then never shown:
no place on Places or on the ticket has a link you can tap, though the raw link is stored. A URL
pasted into the name box becomes the name and overflows the row, while the same URL in the link box
parses fine. On a merged row ("added by Scotty and Scotty · 2 tickets") one remove deletes both
tickets and the confirm does not say so.

**What to build:** The place name is a link to the pasted Maps URL, on Places and on the Dinner
ticket; with no link, the address becomes a maps search link. A URL in the name box is treated as
if pasted in the link box. A merged row shows "× 2" and offers "remove one".

**Blocked by:** 28 — Places names its draw and its controls look like controls

**Status:** ready-for-agent

- [ ] Every Pick with a stored link renders its name as a link opening the map in a new tab, on Places and on the ticket
- [ ] A Pick with an address but no link renders the address as a maps search link
- [ ] Pasting a URL in the name box behaves exactly like pasting it in the link box, and the name is parsed from it
- [ ] A merged row reads "<name> × 2", and remove offers "remove one" by default, with "remove both" available
- [ ] "link didn't read — try again" is replaced by a "paste a new link" pill that opens the link field for that row
- [ ] `lib/maps/maps.test.ts` covers a URL in the name field
