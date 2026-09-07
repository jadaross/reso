# How the shared link, name-picking, and Admin PIN behave

Type: grilling
Status: resolved
Blocked by: —

## Question

Entry is a shared secret link, then pick your name. Pin down the rules: What is the link (a random token in the path)? After picking a name, does that device stay logged in as that Member forever, and can you switch names? Can a Member pick a name already claimed on another device (yes, it's the same person on two phones)? Can the link be rotated if it leaks, and what happens to existing devices? How are Members added (Admin types a name; the Member claims it) and removed (their Picks and Availability stay or go)? PIN: one shared Admin PIN or one per Admin-flagged Member; how it's stored; how long an unlocked Admin session lasts. Run `/grilling` with Jada; update `/CONTEXT.md` for any new terms.

## Context added while charting

Ticket 03 established that an installed iOS home-screen web app starts with an empty cookie jar, separate from Safari. Consequences this ticket must settle: the group secret has to live in the URL path (e.g. `/g/<secret>`) rather than a cookie set in Safari, the manifest should omit `start_url` so iOS launches the app at the page it was added from, and a Member who picks their name in Safari will have to pick it again inside the installed app. See `docs/research/pwa-and-web-push.md`.

## Answer

**The Group Link.** The whole app lives under `/g/<secret>/…` — not a front door that redirects to `/`. A redirect would be fatal: iOS adds the page you are *on* to the Home Screen, so every icon would point at `/`, which the installed app opens with an empty cookie jar and no secret. The secret is 16 characters of base32 (~80 bits, no lookalike characters). It is pasted into WhatsApp once and typed by nobody.

**Identity is per Device, and it is durable.** After picking a name, the Device holds a signed member id in an HttpOnly server-set cookie (`Secure; SameSite=Lax; Path=/`, ~400-day Max-Age, re-issued on every request). `SameSite=Lax` because entry is a top-level navigation in from WhatsApp. Signed, so a Member cannot become another by editing storage. The member id is mirrored in `localStorage` as a hint and `navigator.storage.persist()` is called once in standalone mode. Cookie over `localStorage` for a documented reason: WebKit's storage policy states cookies are not bounded by quota, so they dodge the LRU eviction that can take `localStorage` and IndexedDB.

This is safe because installed Home Screen web apps are exempt from ITP. WebKit's tracking-prevention doc, section "Home Screen Web Application Domain Exempt From ITP": the first-party domain of a Home Screen web app is skipped by the website-data-removal algorithm entirely — cookies included — and its data is isolated from Safari. Confirmed in the WebKit source (`domainsExemptFromWebsiteDataDeletion()`). See `docs/research/ios-storage-persistence.md`. Caveat, not a design constraint: on iOS 26 a user can toggle "open in Safari" when adding to the Home Screen and drop out of the exemption; the two-tap re-pick is the safety net.

**Claiming a name is not exclusive.** Any Device may claim any name, any number of times — a claim answers "who is this Device", it is not an account lock. Jada has an iPad as well as a phone, and phones get replaced. The threat model here is typos, not impersonation, and typos are handled by switching.

**Switching is one tap.** A "Switch name" row in a settings sheet, no confirmation. The current Member's name is shown permanently on the home screen so a wrong pick is noticed in seconds rather than at Close Day.

**Members are created by an Admin typing a name; there is no self-add.** The name then sits in the list unclaimed until a Device taps it. The site records when a name was first claimed and shows the Admin a quiet "not opened yet" marker beside unclaimed names — useful for chasing people before the first Close Day — but never enforces anything with it.

**Removal is an archive, not a delete.** The name leaves the pick-your-name list and stops counting toward Availability and headcount on any open Outing; their Availability on the open Outing is dropped. Their Picks stay in the pool — the Group liked those restaurants, and one may already be a Drawn Pick. Past Visits and Ratings keep their attribution: history must not silently rewrite itself. Their Devices fall back to the pick-your-name screen on next open.

**One Group-wide Admin PIN**, stored as a scrypt hash in a single-row settings table, changeable in-app by anyone already unlocked. Per-Admin PINs would buy an audit trail nobody in a twelve-person friend group will read. The Admin flag on a Member controls only whether the app offers the unlock prompt.

**An unlock lasts 30 days on that Device**, in its own cookie separate from the identity cookie, sliding on each Admin action. No re-prompt for individual destructive actions: a reroll is already visible in the month's history and a removal is an archive that can be undone.

**The Group Link can be rotated, and rotation is cheap.** Because a Device that has already opened the app carries its identity cookie, the secret is only a *bootstrap* credential — the cookie is the durable one. The rule: **revoked secret + valid identity cookie = still allowed; revoked secret + no cookie = blocked.** Secrets therefore live in their own table with a revoked flag, not a single column. Rotation costs nothing for everyone who already has the app installed and shuts out the leaker plus anyone who has not opened it yet.

New terms recorded in `/CONTEXT.md`: **Group Link**, **Device**, **Admin PIN**.
