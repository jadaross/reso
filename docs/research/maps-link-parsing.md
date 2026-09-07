# Parsing pasted Apple Maps / Google Maps links without an API — findings (2026-09-06)

All results verified with curl from a UK IP on 2026-09-06 unless noted. Extends `restaurant-import.md` §1 and §6.

## 1. Apple Maps links

**Shapes seen from the iOS share sheet** [U2]:
- iOS 18 (and iOS 26 after Apple's rollback): `https://maps.apple.com/place?address=<addr>&coordinate=<lat>,<lng>&name=<name>&place-id=I<hex>&map=explore`
- iOS 26 short form: `https://maps.apple/p/<token>` (e.g. `maps.apple/p/U8rE9v8n8iVZjr`)
- Web/search-engine form: `https://maps.apple.com/place?place-id=I<hex>` (e.g. The River Cafe `I92B6B8F2DEB50DC2`)

**What a server fetch yields**

| Source | Name | Address | Lat/lng | Place ID |
|---|---|---|---|---|
| Short link `301 Location` header (no UA needed, ~0.3 s) | `name=` | `address=` (one formatted string) | `coordinate=` | `place-id=` |
| Long-URL query string (no fetch at all) | yes | yes | yes | yes |
| Place page HTML (`place?place-id=…`, 200, ~150 KB, ~0.5 s) | `og:title`, `<title>` | in `<script id="shell-props" type="application/json">` → `initialState.placeCache[muid].component[].addressObject.formattedAddressLines` / `structuredAddress` (thoroughfare, postCode, locality…) | `og:image` `center=lat,lng`; `shell-props` `…mapsId.shardedId.center{lat,lng}` | `shell-props` `…shardedId.placeId` |

The place page also carries `telephone`, business hours, amenities and third-party IDs (Yell, Michelin, TheFork) in the same JSON. No JSON-LD for the place (only an "Apple Maps" Organization block). A bogus `place-id` or short token returns 404 cleanly. Works with no `User-Agent`, `curl`, `Googlebot` and Safari UAs alike — no bot blocking observed.

**Brittleness:** `place-id`, `coordinate`, `name` and `maps.apple/p` are all undocumented; Apple's URL scheme doc lists only `q`, `address`, `ll`, `z`, `t`, `saddr`, `daddr`, `dirflg`, `near`, `sll`, `spn`, `sspn` [U1]. Apple DTS: "The URL is not intended to be a structured API or parsed out like this" [U2]. The `shell-props` shape is an internal web-client contract (`appVersion=1.7.382`) and can change without notice. `maps.apple.com/?q=<name>&address=<addr>` geocodes the *address* server-side and can snap to the wrong street (it resolved "12 Upper St Martin's Lane" to "12 Saint Martin's Close") — don't rely on it.

## 2. Google Maps links

**Shapes:** `https://maps.app.goo.gl/<token>` (app share; e.g. `m958yYewXcebcdtEA` from dishoom.com), and the long form it resolves to:
`https://www.google.com/maps/place/Dishoom+Covent+Garden/@51.5125176,-0.129404,17z/data=!3m1!4b1!4m6!3m5!1s0x487604b7c7d895c5:0x9c3887a3670e0076!8m2!3d51.5125176!4d-0.1268291!16s%2Fg%2F1tdjwh2v?…`

**What a server fetch yields**

| Source | Name | Address | Lat/lng | Place ID |
|---|---|---|---|---|
| Short link `302 Location` (HEAD or GET, ~0.3 s) | path segment after `/maps/place/` (`+`→space, URL-decode) | none | `!3d<lat>!4d<lng>` = the pin. **Not** `@lat,lng,zoom` — that is the viewport centre and differed here (`-0.1294` vs `-0.1268`) | `!1s0x…:0x…` (FTID; second hex = decimal CID usable in `google.com/maps?cid=`), `!16s/g/…` (KG id). No `ChIJ…` Places ID |
| Long URL alone | same as above | none | same | same |
| Place page HTML (200, ~210 KB) | **none** — `og:title` is literally "Google Maps", `<title>` " Google Maps ", `og:description` is boilerplate | none (no "Upper St Martin" anywhere in the body, with or without consent cookie) | `og:image` static map `center=` is the **requester's IP location**, not the place | none |

Google's documented URL API (`/maps/search/?api=1&query=…&query_place_id=…`, `/maps/place/?q=place_id:…`) renders the same generic `og:title`; the `/maps/place/<name>/@…/data=…` form and short links are not documented at all [GU1]. Everything useful therefore comes from the **redirect target URL**, never from the page.

**Bot/consent behaviour observed**
- Short link with no UA, `node`, `undici`, `Mozilla/5.0`, iPhone Safari or `facebookexternalhit` UA → immediate 302 with full `Location`. With a **desktop Chrome UA** it returned 200 and a 35 KB JS shell with no `Location`/meta-refresh, so a "realistic" UA is *worse*.
- From UK/EU egress, `www.google.com/maps/...` with a browser UA is bounced through `consent.google.com/m?continue=…&gl=GB` (302 → 303 → `?ucbcb=1`). A curl-style UA, or sending `Cookie: SOCS=CAI`, skipped it. Vercel functions default to `iad1` (US), where the consent bounce is unlikely, but handle it anyway.
- `maps.app.goo.gl` links are exempt from the Aug-2025 `goo.gl` shutdown; old `goo.gl/maps/*` links that were inactive in late 2024 now 404 [GG1].

## 3. What the Vercel function must do

- Validate the host first (`maps.apple.com`, `maps.apple`, `maps.app.goo.gl`, `goo.gl`, `www.google.com`/`google.com`/`maps.google.com`, `google.co.uk` …) — this is an SSRF surface; reject everything else and private IPs.
- Use `fetch(url, { redirect: 'manual' })` and read the `Location` header (follow at most ~5 hops yourself; Google may chain consent → place). A `HEAD` is enough for both short-link hosts.
- Send a plain UA (Node's default is fine) and `Accept-Language: en`; add `Cookie: SOCS=CAI` for `google.com`. Never send a desktop Chrome UA to `goo.gl`.
- `AbortSignal.timeout(5000)`; cap body reads (Apple page ~150 KB, Google ~210 KB) or skip the body for Google entirely.
- Treat every parser miss as non-fatal (see §4).

## 4. Recommended strategy

1. **Parse the URL before fetching.** Apple long link → `name`, `address`, `coordinate`, `place-id` straight from the query string. Google long link → name from the path, lat/lng from `!3d/!4d`, FTID/CID from `!1s`.
2. **Resolve short links by one manual-redirect HEAD/GET** and re-run step 1 on `Location`.
3. **Apple only, optional enrichment:** GET the place page and read `og:title` + `og:image` `center=` (stable-ish) or `shell-props` (richer: structured address, phone, hours; most brittle). Skip for Google — the page adds nothing.
4. **Address for Google links:** none is available without an API. Options: leave blank; or reverse-geocode `!3d/!4d` with a free service (OSM Nominatim, 1 req/s, identifying UA required) — treat as approximate.
5. **Fallback:** if the host is unknown, the fetch fails/times out, or no coordinate is found, keep the member's typed name, store `raw_link` verbatim, and mark the place `unresolved` so it can be re-parsed later. Always store `raw_link` even on success — the parsers above are undocumented and will break; the link is the durable fact.
6. Store what was found as nullable columns (`name`, `address`, `lat`, `lng`, `apple_place_id`, `google_cid`, `source`), and consider a "looks right?" confirm step, since both providers can hand back a neighbouring pin.

## Sources

- [U1] https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/MapLinks/MapLinks.html — documented Apple Maps URL parameters
- [U2] https://developer.apple.com/forums/thread/805396 — iOS 26 share links, DTS "not intended to be … parsed"
- [GU1] https://developers.google.com/maps/documentation/urls/get-started — Maps URLs (only `api=1` forms documented)
- [GG1] https://blog.google/innovation-and-ai/technology/developers-tools/googl-link-shortening-update/ — goo.gl shutdown, Maps links exempt
- Empirical (curl, 2026-09-06, UK IP): `https://maps.apple/p/U8rE9v8n8iVZjr`; `https://maps.apple.com/place?place-id=I92B6B8F2DEB50DC2` (The River Cafe, London); `https://maps.app.goo.gl/m958yYewXcebcdtEA` (Dishoom Covent Garden, from https://www.dishoom.com/covent-garden); the resolved `https://www.google.com/maps/place/Dishoom+Covent+Garden/@51.5125176,-0.129404,17z/data=…` URL; `https://www.google.com/maps/place/?q=place_id:ChIJN1t_tDeuEmsRUsoyG83frY4`
