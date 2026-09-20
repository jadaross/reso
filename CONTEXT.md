# Reso

A private site for one friend group in London that picks a restaurant to visit each month and finds the date most of the group can make.

## Language

### People

**Group**:
The single fixed set of friends the site serves. There is exactly one.
_Avoid_: Team, workspace, tenant

**Group Link**:
The single shared secret URL that is the Group's only front door. Everyone uses the same link; it is not personal to a Member and does not expire. It can be rotated if it leaks, which shuts out anyone who has not already entered.
_Avoid_: Invite link, magic link, join code

**Member**:
A person in the Group. Identified by picking their own name after entering via the Group Link; there are no passwords or individual logins. Removing a Member archives them rather than deleting them: their past Ratings and their Picks remain.
_Avoid_: User, account, person

**Device**:
One phone or browser that has claimed a Member's name. A Member may have several, and a Device can switch to a different name at any time. Identity is remembered per Device, not per person.
_Avoid_: Session, login, account

**Admin**:
A Member who can add and remove Members, set a month's Price Tier, and override the draw. Booking the table is not an Admin duty; it stays a human task.
_Avoid_: Owner, organiser (as a role)

**Admin PIN**:
The single Group-wide code that unlocks Admin actions on a Device. There is one PIN for the whole Group, not one per Admin.
_Avoid_: Password, passcode (as a per-person credential)

**Plus-one**:
A flag a Member sets for a given month meaning they are bringing one extra guest. A Plus-one is not a Member and has no availability of their own.
_Avoid_: Guest account, partner

### Restaurants

**Pick**:
One Member's entry saying "I want to go here": a restaurant name, an optional map link, and a Price Tier. Two Members wanting the same place make two Picks; the site does not merge them.
_Avoid_: Restaurant (as a shared record), wish, vote, suggestion

**Price Tier**:
One of Low, Medium, High. Every Pick has one, chosen by the Member who added it. Every Outing has one.
_Avoid_: Budget, price level, £/££/£££

### The monthly cycle

**Outing**:
The Group's dinner for one calendar month. It carries a Price Tier, a Chosen Date, and the Drawn Pick, and becomes a Visit once it has happened.
_Avoid_: Event, dinner, booking, session

**Tier Rotation**:
The fixed order Low, Medium, High that assigns each Outing its Price Tier, starting at Low. Since the Month Vote it is the fallback: it stands when nobody votes and breaks a tie it is part of. An Admin can override a single Outing.

**Month Vote**:
Each Member's one vote on what kind of month the one after next should be: Low, Medium, High, or a Dinner Party. Counted on the 1st of the month before, the moment that month's Outing is created. A clear winner takes it; otherwise the Tier Rotation decides a tie it is in, and any other tie is drawn.
_Avoid_: Poll, survey

**Dinner Party**:
A kind of Outing with no Draw: the Group eats at someone's home. It still has a Chosen Date and attendance, and needs a host rather than a booking. Finding the host is a human task, like booking a table.
_Avoid_: Potluck, house night

**Availability**:
The days of an Outing's month a Member has tapped as free. Whole days, dinner implied. A Member with no Availability recorded counts as unavailable all month.
_Avoid_: RSVP, free dates, calendar

**Advance Availability**:
Days a Member has marked free for months whose Outing has not opened yet, filled in from the year screen under Settings. When an Outing opens, its month's Advance Availability becomes that Outing's Availability and is cleared from the advance list, so a month is only ever answered in one place.
_Avoid_: Pre-fill, recurring availability, template

**Close Day**:
The 22nd of the month before the Outing. Availability locks, the Chosen Date is computed, and the Draw runs.

**Chosen Date**:
The day of the Outing's month with the most available Members, after tie-breaks.

**Draw**:
A uniformly random choice among all Picks whose Price Tier matches the Outing. Every Pick is a ticket; nothing else is weighted or filtered.
_Avoid_: Spin, roll, selection

**Drawn Pick**:
The Pick the Draw selected for an Outing.

**Visit**:
The record that an Outing happened: who came, plus each attendee's Rating and optional Note.

**Rating**:
A Member's score out of five for a Visit, with an optional short Note.
