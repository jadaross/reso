# iOS storage persistence for an installed Home Screen web app

How long identity state survives on iOS/Safari under ITP and storage eviction. Facts as of **2026-09-07**; current shipping platform is iOS 26 / Safari 26. Complements `pwa-and-web-push.md` (which established the empty-cookie-jar behaviour) — this document is the evidence for it.

Every claim is tagged:

- **[DOC]** — stated in a primary source Apple/WebKit publishes as documentation or an official blog post.
- **[CODE]** — read directly out of the WebKit open-source tree (`WebKit/WebKit@main`). Authoritative for behaviour, but not a promise, and not versioned to a specific iOS release.
- **[SPEC]** — a W3C/WHATWG/IETF standard, which iOS may or may not follow.
- **[FOLK]** — community-reported, not confirmed by Apple. Treat as a risk signal only.

---

## Summary

**Q1 — Cookie lifetime caps.** The often-quoted "7 days for JS cookies" is **out of date**. WebKit removed the blanket 7-day expiry cap on `document.cookie` cookies in a 2022 release [S6, DOC-secondary][S9, CODE]. Today, on Apple platforms, a JS-set cookie is capped only in narrow cases: **24 hours** if the page was landed on via link decoration from an ITP-classified tracker [S1, DOC][S9, CODE], and **7 days** for cookies written by a script Safari classifies as a known fingerprinting/tracking script [S3, DOC][S9, CODE]. Neither applies to a first-party app writing its own cookie. **Server-set `Set-Cookie` cookies have no general expiry cap in WebKit** — the only server-side cap is 7 days under the CNAME / third-party-IP cloaking defence [S1, DOC], which does not apply to a Vercel-hosted app served from its own domain. `HttpOnly` makes no difference to the caps; it only means script cannot read or write it. **WebKit has not implemented the 400-day RFC 6265bis cap** — the constant `34560000` appears nowhere in the tree, and no cap is applied on the `Set-Cookie` path [S10, SPEC][S9, CODE]. WebKit did signal "positive" on the proposal in January 2022 [S11], so this could change; design as if 400 days is the practical ceiling.

**Q2 — The 7-day script-writable storage rule.** Covers IndexedDB, LocalStorage, Media keys, SessionStorage, and Service Worker registrations and cache — plus, since 2022, JS-set cookies [S1, DOC][S2, DOC]. The clock resets on **user interaction** as ITP defines it: "a user click, tap, or keyboard entry on a website… Scrolling is not considered user interaction" [S1, DOC]. Merely loading the page is not enough. And the countdown is measured in **days the browser was actually used**, not calendar days — WebKit keeps an `OperatingDates` table and compares against a 7-entry short window [S9, CODE][S6, DOC-secondary]. A phone left in a drawer for a month burns no days.

**Q3 (CRITICAL) — Home Screen web apps are exempt. CONFIRMED.** WebKit's own tracking-prevention documentation has a section titled "Home Screen Web Application Domain Exempt From ITP":

> "The first-party domain of home screen web applications is exempt from ITP's 7-day cap on all script-writeable storage, i.e. ITP always skips that domain in its website data removal algorithm. In addition, the website data of home screen web applications is kept isolated from Safari and thus will not be affected by ITP's classification of tracking behavior in Safari." [S1, DOC]

This is corroborated in the source: `ResourceLoadStatisticsStore::domainsExemptFromWebsiteDataDeletion()` unions app-bound domains, managed domains, **persisted domains**, and **the standalone application domain** [S9, CODE]. The exemption is at the level of ITP's whole website-data-removal algorithm, so it covers cookies as well as script-writable storage — not just the 7-day rule but also the 30-day removal for classified domains. Apple has separately said data loss in a Home Screen web app would be "a serious bug": "It is not the intention of Intelligent Tracking Prevention to delete website data for first parties in web applications" [S2, DOC].

**Q4 — Indefinite persistence.** ITP will not delete it [S1, DOC]. Cookies and HTTP cache are **not subject to the storage quota or eviction policy at all** [S4, DOC]. Script-writable storage can still be evicted under overall-quota pressure or system storage pressure, least-recently-used by origin — **unless the origin's storage mode is persistent** [S4, DOC]. `navigator.storage.persist()` **is supported and honoured** from Safari 17.0 / iOS 17, and WebKit "currently grants a request based on heuristics like whether the website is opened as a Home Screen Web App" [S4, DOC] — i.e. our exact case is the documented happy path. Call it anyway; a granted persist also adds the domain to the ITP deletion-exemption set [S9, CODE]. What definitely clears it: the user deleting the Home Screen icon, and "Clear History and Website Data". Offloading does not apply (a web app is not an App Store app). See §4 for what is documented vs. assumed here — the "deleting the icon deletes the data" step is **not** documented by Apple.

**Q5 — Recommendation.** Belt and braces, in this order:

1. **Primary: an `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, `Max-Age=34560000` (400 days) server-set cookie** carrying the member id, refreshed (re-`Set-Cookie`) on every request or at least every page load. Rationale: cookies are outside the quota/eviction system entirely [S4, DOC], server-set cookies have no WebKit expiry cap [S1, DOC][S9, CODE], `HttpOnly` puts it out of reach of any script bug, and a rolling refresh means the expiry never actually arrives. 400 days rather than 10 years so that a future WebKit 400-day cap is a no-op.
2. **Mirror in `localStorage`** (plain, non-sensitive: the member id). Cheap, synchronous, survives a cookie-jar oddity, and lets the client re-assert identity to the server if the cookie vanishes. Not the source of truth.
3. **Call `navigator.storage.persist()` once on first launch** in standalone mode, and record `persisted()`. It is granted heuristically for Home Screen web apps [S4, DOC] and adds ITP-deletion exemption [S9, CODE]. Guard it — it is absent on older WebKit.
4. **Skip IndexedDB for identity.** It buys nothing a cookie plus `localStorage` does not, and it is the storage form with the most credible data-loss reports (§6).
5. **Always have a cheap recovery path**: if identity is missing, the app must land on `/g/<secret>` and show the name picker again. That is the real durability guarantee. Make re-identifying a two-tap operation, not a support ticket.

**The pitfall this project already hit:** the installed app starts with an **empty cookie jar, separate from Safari**. Apple, on WebKit bug 181849: "The current behavior (on Apple platforms) is by design. Home Screen apps are created as isolated entities without shared state with the browser." [S5, DOC]. So a name-cookie set while browsing in Safari does **not** exist in the installed app. Consequences: the secret must live in the launch URL path (`/g/<secret>`, no `start_url`), and the name pick must happen again inside the installed app. Second pitfall: iOS supports **multiple installs of the same web app**, disambiguated by manifest `id` + user-chosen name [S12, DOC]; a member who installs twice may have to identify twice.

**Q6 — Known bugs.** No documented Apple bug where installed web app data is lost on an iOS version upgrade. There is a real, documented iOS 17.4 regression — Home Screen web apps in the EU were forced to open in Safari, which for affected users is indistinguishable from "the app forgot me" — reported 2024-02-02, resolved after Apple reversed the decision in March 2024 [S7, DOC]. Everything else in this area is **[FOLK]**: recurring developer-forum reports of IndexedDB connections dropping and LocalStorage being wiped on iOS 17.x [S8, FOLK]. Plan for occasional loss; do not plan around a specific bug.

---

## 1. Cookie lifetime caps

### What WebKit documents today

The current "Tracking Prevention in WebKit" page [S1] (living document, no version stamp) lists exactly three cookie-expiry mechanisms:

- **Link decoration (24 hours).** "ITP detects such link decoration and caps the expiry of cookies created in JavaScript on the landing webpage to 24 hours." Only fires when the user arrived from a domain ITP has classified as having tracking capabilities, with query params or a fragment [S1, DOC]. Introduced as ITP 2.2, 2019.
- **CNAME / third-party IP cloaking (7 days).** "ITP detects third-party CNAME cloaking and third-party IP address cloaking requests and caps the expiry of any cookies set in the HTTP response to 7 days." This is the **only** documented cap on server-set cookies. It fires when a first-party subresource resolves through a CNAME differing from the first-party domain [S1, DOC]. A normal Vercel deployment on its own domain, setting cookies from its own responses, does not trigger it.
- **7-day cap on all script-writeable storage.** "ITP deletes all cookies created in JavaScript and all other script-writeable storage after 7 days of no user interaction with the website." [S1, DOC]. Note the wording: this is *deletion after inactivity*, not an *expiry cap*.

Notably absent: any general cap on `Set-Cookie` lifetime, and any 400-day limit.

### The change to `document.cookie` cookies

ITP 2.1 (WebKit blog, 2019-02-21) introduced a hard 7-day expiry cap on all client-side cookies. That was reversed. Simo Ahava documented it on **2022-11-14** [S6]:

> "In a recent 2022 release (I don't have the exact date or version number), WebKit has now modified this mechanism to no longer set an expiration cap on JavaScript cookies. … This does not mean that WebKit rolled back the change from ITP 2.1. Rather, it means that WebKit is converging the restrictions placed on all script-writable storage, which includes JavaScript cookies."

That is a secondary source, so it was verified in the tree [S9, CODE]:

- `NetworkStorageSession::setCookiesFromDOM()` (the `document.cookie` write path) computes `clientSideCookieCap(...)` and, if non-empty, passes it to `capExpiryOfPersistentCookie()`. The `Set-Cookie` path does not call `capExpiryOfPersistentCookie` at all.
- `clientSideCookieCap()` returns:
  - `m_ageCapForClientSideCookiesForScriptTrackingPrivacy` if the writing script requires script-tracking privacy;
  - otherwise, **under `ENABLE(JS_COOKIE_CHECKING)`**, `std::nullopt` — *no cap* — except when the current page is a link-decoration target, in which case `m_ageCapForClientSideCookiesForLinkDecorationTargetPage`.
- `Source/WTF/wtf/PlatformEnableCocoa.h` sets `ENABLE_JS_COOKIE_CHECKING 1` for `PLATFORM(MAC) || PLATFORM(IOS) || PLATFORM(MACCATALYST) || PLATFORM(VISION)`. **iOS is in the no-cap branch.**
- The cap values seeded from `ResourceLoadStatisticsStore::Parameters`: `clientSideCookiesAgeCapTime { 24_h * 7 }` and `clientSideCookiesForLinkDecorationTargetPageAgeCapTime { 24_h }` — i.e. the 7 days and 24 hours above.

### Script tracking privacy (Safari 26 / iOS 26)

Safari 26.0 (WebKit blog, **2025-09-15**) extends fingerprinting protection: "Safari additionally prevents these scripts from setting long-lived script-written storage such as cookies or LocalStorage." [S3, DOC]. In the tree this is the `RequiresScriptTrackingPrivacy::Yes` branch, capped at the same 7 days [S9, CODE]. It applies to **scripts Safari has classified as known fingerprinting scripts**, not to a first-party app's own code. Irrelevant to Reso unless a third-party script is added.

### The 400-day RFC cap

RFC 6265bis says a user agent "MUST limit the maximum age of the cookie… SHOULD NOT be greater than 400 days (34560000 seconds)" [S10, SPEC]. Chrome ships it; Firefox shipped the `Max-Age` half in Firefox 140 (June 2025). WebKit responded "positive" to the request for position on **webkit-dev, January 2022** [S11] — but the constant `34560000` does not appear anywhere in the WebKit tree, and no cap is applied on the `Set-Cookie` path [S9, CODE]. **Conclusion: not implemented as of this writing, but signalled as acceptable.** Setting `Max-Age=34560000` is the safe choice: it is the longest value that survives a future implementation unchanged.

### `HttpOnly`

No WebKit cap keys off `HttpOnly`. It matters for a different reason: `HttpOnly` cookies can only be set by the server, so they are structurally outside the "cookies created in JavaScript" bucket that ITP's 7-day deletion rule targets, and cannot be clobbered by a script bug. In `parseDOMCookie`, an `HttpOnly` cookie is rejected from the DOM write path entirely [S9, CODE].

---

## 2. The 7-day cap on all script-writable storage

Announced in "Full Third-Party Cookie Blocking and More", WebKit blog, **2020-03-24**, by John Wilander, shipping in iOS/iPadOS 13.4 and Safari 13.1 [S2, DOC].

### What it covers

Verbatim from both the blog post [S2] and the current documentation [S1]:

- IndexedDB
- LocalStorage
- Media keys
- SessionStorage
- Service Worker registrations and cache

The blog adds "(excluding some legacy website data types)". Since 2022, JS-set cookies are in the same bucket [S1, DOC][S6, DOC-secondary]. **Not covered:** server-set cookies, and the HTTP cache (which has its own "verified partitioned cache" mechanism).

### What resets the clock

**User interaction, as ITP defines it**, not mere use of the site:

> "User interaction is a user click, tap, or keyboard entry on a website. Some refer to it as a user gesture. Scrolling is not considered user interaction." [S1, DOC]

It must be first-party — an embedded iframe load does not count, though a successful Storage Access API grant does [S6, DOC-secondary]. In the tree, `logUserInteraction()` writes `mostRecentUserInteractionTime` and the removal decision runs through `hasHadUnexpiredRecentUserInteraction(..., OperatingDatesWindow::Short)` [S9, CODE].

### Days of browser use, not calendar days

The blog is explicit: deletion happens "after seven days of **Safari use** without user interaction on the site" [S2, DOC, emphasis added]. The implementation confirms it — WebKit maintains an `OperatingDates` SQL table, one row per day the browser was used, with `constexpr unsigned operatingDatesWindowShort { 7 }` and `operatingDatesWindowLong { 30 }`. `hasStatisticsExpired()` compares the interaction date against `m_shortWindowOperatingDate`, which is derived from that table, not from wall-clock elapsed time [S9, CODE].

So: seven *distinct days on which the browser ran*, with no click/tap/keypress on the site on any of them. Simo Ahava's practical caveat is fair — "The difference between 7 days of browser use and 7 calendar days is often non-existent" [S6] — for a daily browser user they are the same thing.

**None of this applies to a Home Screen web app.** See §3.

---

## 3. Home Screen web app exemption — CONFIRMED

### The direct statement

"Tracking Prevention in WebKit" [S1, DOC] has a dedicated section, quoted here in full:

> **Home Screen Web Application Domain Exempt From ITP**
>
> "The first-party domain of home screen web applications is exempt from ITP's 7-day cap on all script-writeable storage, i.e. ITP always skips that domain in its website data removal algorithm. In addition, the website data of home screen web applications is kept isolated from Safari and thus will not be affected by ITP's classification of tracking behavior in Safari."

Two distinct guarantees:

1. **Skipped in the website data removal algorithm** — note it says the removal algorithm generally, not only the 7-day rule. That algorithm is what deletes cookies and other website data for classified domains after 30 days [S1, DOC], so the exemption covers cookies too.
2. **Storage isolated from Safari** — ITP's classification of the domain based on Safari browsing cannot reach into the web app's storage.

### The 2020 blog's framing

"A Note On Web Applications Added to the Home Screen" [S2, DOC]:

> "As mentioned, the seven-day cap on script-writable storage is gated on 'after seven days of Safari use without user interaction on the site.' That is the case in Safari. Web applications added to the home screen are not part of Safari and thus have their own counter of days of use. Their days of use will match actual use of the web application which resets the timer. We do not expect the first-party in such a web application to have its website data deleted.
>
> If your web application does experience website data deletion, please let us know since we would consider it a serious bug. It is not the intention of Intelligent Tracking Prevention to delete website data for first parties in web applications."

Note this 2020 framing is weaker than the current documentation: it says the *counter* runs separately, not that the domain is skipped outright. The current [S1] language ("ITP always skips that domain") is the stronger and more recent claim, and matches the code.

### Code-level confirmation

`Source/WebKit/NetworkProcess/Classifier/ResourceLoadStatisticsStore.cpp` [S9, CODE]:

```cpp
bool ResourceLoadStatisticsStore::shouldExemptFromWebsiteDataDeletion(const RegistrableDomain& domain) const
{
    return !domain.isEmpty() && domainsExemptFromWebsiteDataDeletion().contains(domain);
}

HashSet<RegistrableDomain> ResourceLoadStatisticsStore::domainsExemptFromWebsiteDataDeletion() const
{
    auto result = m_appBoundDomains.unionWith(m_managedDomains);
    result = result.unionWith(m_persistedDomains);

    if (!m_standaloneApplicationDomain.isEmpty())
        result.add(m_standaloneApplicationDomain);

    return result;
}
```

`m_standaloneApplicationDomain` is plumbed from `WebsiteDataStoreCocoa.mm`:

```cpp
parameters.networkSessionParameters.resourceLoadStatisticsParameters.standaloneApplicationDomain
    = WebCore::RegistrableDomain { m_configuration->standaloneApplicationURL() };
```

`m_persistedDomains` comes from `WebsiteDataStore::setPersistedSiteURLs()` — i.e. origins in persistent storage mode also get the exemption. That is a second, independent reason to call `navigator.storage.persist()`.

### What the exemption does not cover

- It is scoped to the **first-party registrable domain** of the web app. Third parties embedded inside the web app get no exemption.
- It is an ITP exemption. It says nothing about **quota-driven eviction**, which is a separate subsystem (§4).
- It does not survive using the site **in Safari** rather than in the installed app. In Safari the site is an ordinary site, subject to the ordinary 7-day rule — and that Safari-side storage is a different jar anyway (§5).

### Corroboration

Apple Developer Forums thread 710157, "Safari iOS PWA Data Persistence Beyond 7 Days" [S8]: the accepted answer (Feb 2023) is "Yes, Home Screen apps don't have this limitation" and cites [S1]. **Caveat: the responder is a community member, not Apple staff.** It adds no evidence beyond [S1]; it is included only because it is the thread people will find first.

---

## 4. Does it persist indefinitely? What clears it?

### ITP will not touch it

Established in §3 [S1, DOC].

### Quota and eviction are a separate system

"Updates to Storage Policy", WebKit blog, **2023-08-10**, by Sihui Liu [S4, DOC]. Shipping in Safari 17.0 / iOS 17 / iPadOS 17 / macOS Sonoma.

**Cookies are out of scope entirely:**

> "There are many types of website data, and the policy discussed in this post is mostly related to the types created by storage APIs: localStorage, Cache API, IndexedDB, Service Worker, and File System. **Other types like cookies and HTTP cache are currently not subject to the policy below — for example, they are not bounded by quota.**" (emphasis added)

This is the single strongest argument for putting identity in a cookie.

**Quota for standalone web apps** is the same as in the browser:

> "When a web app is running standalone (as Home Screen Web App on iOS or Web App added to dock on macOS), it has the same origin quota and overall quota as when it is opened in a browser app."

Browser app: origin quota up to 60% of total disk, overall quota up to 80%. (For non-browser apps embedding WebKit: 15% / 20%.)

**Eviction:**

> "Eviction means automatic website data deletion that is not initiated by the user or website. It can happen under a few conditions: when exceeding the overall quota, when the system is under storage pressure, or when the site has not been interacted with by the user for some time (see Intelligent Tracking Prevention).
>
> WebKit normally evicts data on an origin basis: the data of an origin will be deleted as a whole. The ordering of origins to be deleted is decided using a least-recently-used policy. The last use time is the time of the last user interaction, or the time of the last storage operation.
>
> Origin might be excluded from eviction if it has active page at the time of eviction, or its storage is in persistent mode. By default, all origins use a best-effort mode…"

So low-disk-space eviction **is** real for `localStorage`/IndexedDB, LRU by origin, and the defence is persistent mode. A tiny app that is used monthly is near the bottom of any LRU list, but "near the bottom" is not "excluded".

### `navigator.storage.persist()` on iOS — supported and honoured

[S4, DOC]:

> "Starting in Safari 17.0, and in WebKit apps for iOS 17, iPadOS 17 and macOS Sonoma, the Storage API is fully supported. … An origin can check whether storage is in persistent mode with `StorageManager.persisted()` and request to change the mode to be persistent with `StorageManager.persist()`. **WebKit currently grants a request based on heuristics like whether the website is opened as a Home Screen Web App.**" (emphasis added)

The Safari 17 post also notes "critical bug fixes have been made to ensure the storage mode value is remembered across sessions, and eviction will count on it" — implying it was buggy before iOS 17. Feature-detect (`navigator.storage?.persist`) and treat a `false` result as non-fatal.

Per [SPEC] (Storage Standard, `persist()` is a request the UA may refuse), a `true` return is a UA promise not to evict, not a promise against user action or app deletion.

### What actually clears it

| Action | Effect | Evidence |
| --- | --- | --- |
| ITP 7-day / 30-day removal | **Does not apply** to the standalone app domain | [S1, DOC][S9, CODE] |
| Quota / storage-pressure eviction | Applies to localStorage, IndexedDB, Cache API, SW, File System — **not** cookies or HTTP cache; avoided by persistent mode | [S4, DOC] |
| Settings → Safari → "Clear History and Website Data" | Clears Safari's website data. Whether it reaches the isolated Home Screen web app store is **not documented by Apple**. Widely reported to clear it. Assume it does. | [FOLK] |
| Deleting the Home Screen icon | Assume all of the app's storage goes with it. **Not documented by Apple** — the Apple Support page on adding a web app [S13] does not address data. WebKit bug 181849 establishes the store is per-web-app-instance, which makes deletion-with-the-app the natural design. | [S5, DOC] for isolation; deletion itself is [FOLK] |
| Offloading | Not applicable — a Home Screen web app is not an App Store app and has no offload path | — |
| iOS version upgrade | No documented data loss. See §6. | — |

This table is the weakest part of the document. Apple documents what *does not* delete the data far better than what does.

---

## 5. Practical recommendation for Reso

Target: keep a Member identified inside the installed app for a year or more, no passwords.

### Ranking of mechanisms

| Mechanism | Survives ITP? | Survives quota eviction? | Verdict |
| --- | --- | --- | --- |
| `HttpOnly` server-set cookie | Yes — domain exempt [S1] | **Not subject to quota at all** [S4] | **Primary** |
| `localStorage` | Yes — domain exempt [S1] | Only if persistent mode granted [S4] | Mirror |
| IndexedDB | Yes — domain exempt [S1] | Only if persistent mode granted [S4] | Skip |
| Service Worker cache | Yes — domain exempt [S1] | Only if persistent mode granted [S4] | Not for identity |
| `sessionStorage` | — | — | Never (per-session by definition) |

### Concretely

```
Set-Cookie: reso_member=<signed id>; Path=/; Max-Age=34560000; HttpOnly; Secure; SameSite=Lax
```

- **Rolling refresh.** Re-issue the cookie on every response that identifies the member (or at minimum on each page load). Expiry then never arrives, and a future 400-day WebKit cap becomes a no-op.
- **`Max-Age=34560000`, not ten years.** Exactly the RFC 6265bis ceiling [S10, SPEC]; nothing is lost if WebKit ships the cap.
- **`SameSite=Lax`, not `Strict`.** The app is entered by tapping a shared secret link (`/g/<secret>`), which is a top-level cross-site navigation. `Lax` sends the cookie on those; `Strict` would not, and the member would look logged out on exactly the path they use to get in.
- **`HttpOnly`.** No script needs to read it; the server tells the client who it is. Removes it from the "cookies created in JavaScript" bucket ITP targets.
- **Sign it** (Next.js `cookies()` plus an HMAC, or an encrypted session cookie). It is a bearer credential for a member identity — cheap to forge otherwise, and the whole app is behind one shared secret already.
- **Mirror the member id in `localStorage`** on the client, plainly. If the server sees no cookie but the client posts a stored id, re-issue the cookie. Belt and braces, and it costs one line.
- **Call `navigator.storage.persist()` once** on first launch when `matchMedia('(display-mode: standalone)').matches`. Documented to be granted heuristically for Home Screen web apps [S4], and adds ITP-deletion exemption independent of the standalone-domain exemption [S9].

### Pitfalls

1. **The installed app starts with an empty cookie jar.** WebKit bug 181849, comment 3, Brent Fulgham (Apple), **2022-02-01** [S5, DOC]: "The current behavior (on Apple platforms) is by design. Home Screen apps are created as isolated entities without shared state with the browser." Reported 2018; still `NEW`; will not be fixed. Therefore: the secret must be in the launch URL path (`/g/<secret>`, no `start_url`, so iOS uses the page that linked to the manifest), and the name pick must happen again inside the installed app. macOS "Add to Dock" behaves differently (it copies cookies) — do not generalise from testing on a Mac.
2. **Multiple installs.** "iOS has supported multiple installs of the same web app since the very beginning" — disambiguated by manifest `id` combined with the user-chosen name [S12, DOC, 2023-02-16]. A member who adds the app twice may get two identities. Whether the two installs share a storage partition is **not documented**; assume they do not.
3. **iOS 26 changes the default.** From Safari 26.0 (**2025-09-15**), "every website added to the Home Screen opens as a web app" by default, manifest or not, with an "Open as Web App" toggle the user can disable [S3, DOC]. If a member disables it, they get a bookmark opening in their default browser — no ITP exemption, ordinary 7-day rule, and a different cookie jar. The app should detect non-standalone mode and say so.
4. **Trying it in Safari first.** A member who taps the secret link, picks their name in Safari, *then* installs, will find the installed app does not know them. The name picker must be idempotent and reachable, not a one-time onboarding wizard.
5. **Never treat identity loss as an error state.** The recovery is: land on `/g/<secret>`, tap your name. Two taps. Design for it rather than against it.

---

## 6. Known bugs

### Documented

- **WebKit bug 268643** — "[iOS 17.4 Beta in EU] REGRESSION: PWA added to Home Screen are forced to open in Safari". Reported **2024-02-02**; `RESOLVED FIXED` [S7]. Affected EU users only. Home Screen web apps launched into Safari instead of standalone mode, which — because the Safari jar is a different jar — presents to the user as the app having forgotten them, and killed Web Push for those users. Apple confirmed the removal was deliberate DMA-compliance work in Feb 2024, then reversed in March 2024 and restored pre-17.4 behaviour. Relevant as a *class* of risk: Apple has shipped a change that broke standalone launch, in a point release, regionally.
- **WebKit bug 181849** — "'Add to homescreen' apps don't share storage with Safari". Reported 2018-01-19, still `NEW`, marked working-as-intended by Apple in 2022 [S5]. Not a bug that will be fixed; it is the design.

### Community-reported only [FOLK]

Recurring Apple Developer Forums threads, none with an Apple staff answer:

- iOS 17.x: PWAs losing their IndexedDB connection, returning to a login screen, and after a few loops `localStorage` being wiped (forum threads 737827, 740065) [S8].
- Random IndexedDB data loss on iOS (threads 750122, 730023); reports that it worsened around iOS 17.4.x [S8].
- Thread 740590 asks specifically whether PWA cookies and data are cleared when an iPad is unused for long periods. **No Apple answer.** [S8]
- The PWA-POLICE bug list [S14] catalogues Cache Storage disappearing (iOS 12 era) and the Safari/standalone cookie split, but records no upgrade-triggered wipe.

**No documented case of Home Screen web app data being lost specifically by an iOS version upgrade** was found. Absence of evidence, not evidence of absence — this is precisely the kind of event that produces "it just logged everyone out" reports without a bug number.

---

## Confidence and gaps

**High confidence (primary, current, corroborated by source code):**

- Home Screen web apps are exempt from ITP's website-data removal, including the 7-day script-writable-storage cap. §3. [S1][S9]
- Home Screen web app storage is isolated from Safari; the installed app starts with an empty cookie jar, by design. §5. [S1][S5]
- Cookies and HTTP cache are not subject to WebKit's storage quota or eviction policy. §4. [S4]
- There is no general WebKit expiry cap on server-set cookies; the only server-side cap is the 7-day CNAME/IP-cloaking defence. §1. [S1][S9]
- WebKit has not implemented the 400-day cap. §1. [S9]
- The 7-day clock is reset by ITP-defined user interaction and counted in days of browser use, via an `OperatingDates` table. §2. [S1][S2][S9]
- `navigator.storage.persist()` is supported from Safari 17.0 / iOS 17 and heuristically granted for Home Screen web apps. §4. [S4]

**Medium confidence:**

- That the blanket 7-day cap on `document.cookie` cookies is gone on iOS. The code path is unambiguous [S9], and a well-regarded practitioner documented the change [S6] — but **Apple has never announced it**, and no WebKit blog post or release note describes the removal. If ITP behaviour must be relied on exactly, test on device.
- That the ITP exemption covers cookies and not just script-writable storage. The wording "ITP always skips that domain in its website data removal algorithm" [S1] and the code [S9] both support it, but Apple never says the word "cookies" in that section.
- That `document.cookie` written inside a Home Screen web app is uncapped. It should follow from both the exemption and the JS_COOKIE_CHECKING branch, but the exemption is documented against *deletion*, not against *expiry capping*, and the two are different mechanisms. Use a server-set cookie and the question does not arise.

**Low confidence / genuine gaps:**

- **What deletes an installed web app's data.** Apple documents no lifecycle for Home Screen web app storage. Whether deleting the icon deletes the data, and whether Settings → Safari → "Clear History and Website Data" reaches the isolated store, are both **undocumented**. The universal community assumption is yes to both; there is no Apple statement either way. Apple's own support page on turning a website into a web app [S13] says nothing about data.
- **Whether two installs of the same web app share a storage partition.** Undocumented. [S12] establishes they are distinguishable for Focus/notification purposes only.
- **Behaviour across iOS major upgrades.** No documentation, no bug reports found that isolate an upgrade as the cause. Community reports of data loss cluster around iOS 17.x generally.
- **Whether ITP even runs inside a Home Screen web app.** The exemption implies the machinery is present with the first-party domain excluded, but Apple does not describe the web app's tracking-prevention configuration.
- **`[CODE]` findings track `WebKit/WebKit@main`, not a shipped iOS build.** Apple's shipping WebKit can differ, and internal Apple-only behaviour (`rdar://`) is not visible in the open tree. Everything read from source is a strong indication, not a guarantee.

**Contradictions noted:**

- The 2020 blog [S2] says Home Screen web apps merely have "their own counter of days of use" (a weaker claim: the timer exists but resets on app use). The current documentation [S1] says the domain is skipped outright. The code [S9] supports the stronger, newer claim. Where these disagree, [S1] and [S9] win — but note that under [S2]'s framing, an app not opened for seven days of "web app use" could theoretically still be cleaned, which is a reason not to lean the whole design on the exemption.
- Search results routinely repeat "iOS deletes PWA data when users haven't used the app in 7 days". That is **false for installed Home Screen web apps** and directly contradicted by [S1]. It is the single most common piece of folklore in this area.

---

## Sources

- [S1] WebKit, "Tracking Prevention in WebKit" (living document; retrieved 2026-09-07) — https://webkit.org/tracking-prevention/
- [S2] WebKit, "Full Third-Party Cookie Blocking and More", John Wilander, 2020-03-24 — https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/
- [S3] WebKit, "WebKit Features in Safari 26.0", 2025-09-15 — https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
- [S4] WebKit, "Updates to Storage Policy", Sihui Liu, 2023-08-10 — https://webkit.org/blog/14403/updates-to-storage-policy/
- [S5] WebKit bug 181849, "'Add to homescreen' apps don't share storage with Safari"; comment 3 by Brent Fulgham (Apple), 2022-02-01 — https://bugs.webkit.org/show_bug.cgi?id=181849
- [S6] Simo Ahava, "Expiration Cap Removed From JavaScript Cookies In WebKit Browsers", 2022-11-14 (secondary, high-trust practitioner source) — https://www.simoahava.com/privacy/first-party-cookies-webkit-revisited/
- [S7] WebKit bug 268643, "[iOS 17.4 Beta in EU] REGRESSION: PWA added to Home Screen are forced to open in Safari", reported 2024-02-02, RESOLVED FIXED — https://bugs.webkit.org/show_bug.cgi?id=268643
- [S8] Apple Developer Forums — thread 710157 (PWA data persistence beyond 7 days, Feb 2023, community answer) https://developer.apple.com/forums/thread/710157 ; 737827 (iOS 17 PWA issues) ; 740065 (PWA login loop under iOS 17) ; 740590 (PWA data cleared after long idle — unanswered) ; 750122 / 730023 (IndexedDB data loss)
- [S9] WebKit source, `WebKit/WebKit@main` (read 2026-09-07):
  `Source/WebCore/platform/network/NetworkStorageSession.{h,cpp}` (`clientSideCookieCap`, `setAgeCapForClientSideCookies`, `capExpiryOfPersistentCookie`) ·
  `Source/WebCore/platform/network/cocoa/NetworkStorageSessionCocoa.mm` (`setCookiesFromDOM`, `parseDOMCookie`) ·
  `Source/WTF/wtf/PlatformEnableCocoa.h` (`ENABLE_JS_COOKIE_CHECKING`) ·
  `Source/WebKit/NetworkProcess/Classifier/ResourceLoadStatisticsStore.{h,cpp}` (`domainsExemptFromWebsiteDataDeletion`, `operatingDatesWindowShort/Long`, `hasStatisticsExpired`, `Parameters`) ·
  `Source/WebKit/UIProcess/WebsiteData/Cocoa/WebsiteDataStoreCocoa.mm` and `Source/WebKit/UIProcess/WebsiteData/WebsiteDataStore.cpp` (`standaloneApplicationDomain`, `setPersistedSiteURLs`) — https://github.com/WebKit/WebKit
- [S10] IETF, "Cookies: HTTP State Management Mechanism" (draft-ietf-httpbis-rfc6265bis), 400-day limit — https://httpwg.org/http-extensions/draft-ietf-httpbis-rfc6265bis.html
- [S11] webkit-dev, "Request for position: Cookie Expires/Max-Age attribute upper limit", January 2022; recorded as WebKit "positive" in the Chromium intent thread — https://lists.webkit.org/pipermail/webkit-dev/2022-January/032096.html and https://groups.google.com/a/chromium.org/g/blink-dev/c/blQFS8L3Drw
- [S12] WebKit, "Web Push for Web Apps on iOS and iPadOS", Brady Eidson and Jen Simmons, 2023-02-16 (manifest `id`, multiple installs) — https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- [S13] Apple Support, "Turn a website into an app in Safari on iPhone" — https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios
- [S14] PWA-POLICE, "List of PWA Bugs and workarounds" (community-maintained) — https://github.com/PWA-POLICE/pwa-bugs
