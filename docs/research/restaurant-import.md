# Bulk-importing restaurants into a Next.js app — findings (2026-09-06)

## 1. Apple Maps saved places / Guides / Favorites

- **No official read API.** Apple Maps Server API and MapKit JS expose search, geocode, place lookup, directions, ETAs only [A1]. Nothing reads a user's Places library, Favorites, or Guides.
- **No Shortcuts action.** Apple's stock Maps/Location actions are: Get Current Location, Find Places, Filter Locations, Open Directions, Open in Maps, Get Details of Locations, Get Maps URL, Get Distance/Travel Time/Halfway Point, parked-car actions [S1]. None reads Guides/Favorites/Library.
- **Guide share links are self-contained.** A shared Guide is `https://guides.apple.com/?ug=<urlencoded base64 protobuf>` (301 -> `https://maps.apple.com/?ug=...`) [G1]. I decoded a real one: field 1 = guide name (`"Guide"`), field 2 repeated = `{ provider: 6489, auid: <uint64> }` per place. No names, addresses, or coordinates for catalog places — only Apple 64-bit `auid`s (custom pins carry name/address/lat-lng instead, per the 2020 reverse-engineering of the identical Collections format [G2]). The shared guide is a snapshot; Android/web viewers get a maps.apple.com preview [G3].
- **auids are publicly resolvable, unofficially.** `https://maps.apple.com/place?auid=<auid>` returns server-rendered HTML with `og:title` (place name) and an `og:image` snapshot URL whose `center=lat,lng` gives coordinates (verified with curl, no auth). This is scraping, not an API; Apple's DTS said of Maps URLs "The URL is not intended to be a structured API or parsed out" [U2]. `place-id=I<hex(auid)>` did **not** resolve (404), so auid -> Place ID is not a simple hex rewrite.
- **Export to CSV/KML/GeoJSON:** none in Apple Maps [G4].

## 2. Apple Maps Server API / MapKit JS

- **Endpoints:** `/v1/token`, `/v1/geocode`, `/v1/reverseGeocode`, `/v1/search`, `/v1/searchAutocomplete`, `/v1/place/{id}`, `/v1/place` (multi), `/v1/place/alternateIds`, `/v1/directions`, `/v1/etas` [A1].
- **`/v1/search`:** `q` (required), `searchLocation`, `searchRegion`, `userLocation`, `lang`, `resultTypeFilter=Poi`, `includePoiCategories=Restaurant,Cafe`, `excludePoiCategories`, `limitToCountries`, `searchRegionPriority`, `enablePagination`, `pageToken` [A2].
- **Place object fields:** `id`, `alternateIds`, `name`, `coordinate`, `formattedAddressLines`, `structuredAddress`, `displayMapRegion`, `country`, `countryCode`. **No** phone, website, hours, price level, rating, or even `poiCategory` on the returned Place [A3]. MapKit JS `Place` adds `pointOfInterestCategory`, `areasOfInterest`, address parts — still **no** phone/website/hours/price/rating [A4]. MapKit JS `PlaceDetail` renders a card (hours etc.) but is a widget, not data [A5].
- **PoiCategory** is coarse: `Restaurant`, `Cafe`, `Bakery`, `Brewery`, `Winery`, `Distillery`, `FoodMarket`, `Nightlife`; no cuisine subtypes [A6].
- **Place IDs** are opaque and may change; use `/v1/place/alternateIds` to migrate [A7].
- **Auth/pricing:** Maps ID + private key from an Apple Developer Program account; sign a JWT, exchange at `/v1/token`. Free: 250,000 map views + **25,000 service calls/day per Developer Program membership, shared between MapKit JS and Server API**; HTTP 429 beyond that; higher capacity via request form, no published price [A8][A9]. Caching/storage rules are in the Developer Program License Agreement Schedule 6 (DTS declined to interpret) [A9].

## 3. Google Places API (New)

- **Text Search:** POST `places:searchText`, `textQuery`, `locationBias` (circle <= 50 km or rectangle), `includedType`, `pageSize` 1-20, max 60 results via `nextPageToken`; field mask is mandatory [P1].
- **Fields by SKU** (billed at highest tier used) [P2]:
  - Essentials IDs Only: `id`, `name`, `attributions`, `photos`
  - Essentials: `formattedAddress`, `addressComponents`, `location`, `types`, `viewport`
  - Pro: `displayName`, `primaryType`, `primaryTypeDisplayName`, `businessStatus`, `googleMapsUri`
  - Enterprise: `priceLevel`, `priceRange`, `rating`, `userRatingCount`, `regularOpeningHours`, `currentOpeningHours`, `websiteUri`, `nationalPhoneNumber`, `internationalPhoneNumber`
  - Enterprise + Atmosphere: `reviews`, `editorialSummary`, `servesVegetarianFood`, `takeout`, `reservable`, ...
- **Pricing (since 2025-03-01; $200 credit replaced by per-SKU free caps)** [P3][P4]: IDs-Only Text Search / Place Details = unlimited free. Free/month: Essentials 10,000, Pro 5,000, Enterprise 1,000. Per 1,000 (0-100K): Text Search Pro $32, Enterprise $35; Place Details Essentials $5, Pro $17, Enterprise $20; Autocomplete $2.83.
  - Cheapest restaurant-with-price flow: Text Search IDs-only (free) -> Place Details Enterprise ($20/1k, 1,000 free/mo).
- **Rate limits:** per-method per-minute quotas per project, managed in Cloud Console; no published default [P5].
- **Terms:** may cache lat/lng <= 30 consecutive days; place IDs storable indefinitely; other content not to be stored; attribution required; Places content not to be used with a non-Google map [P6][P7].

## 4. Google Maps saved lists via Takeout

- Takeout product **"Saved"** -> one CSV per list (Starred, Want to go, Favorites, custom). Columns: `Title, Note, URL, Comment`. No coordinates; `URL` is a `google.com/maps/place/...` link, not a Places `place_id` [T1][T2].
- Takeout product **"Maps (your places)"** -> `Saved Places.json` (GeoJSON) with coordinates, `google_maps_url`, address/name properties; starred places only; some entries export as `[0,0]` [T2][T3]. Files vary by account — inspect before parsing [T3].
- Practical path: parse Title (+ address if present) and resolve via Text Search.

## 5. "Paste names + city" resolution pitfalls

- Ambiguity: chains and generic names return multiple candidates; Apple gives no ranking/rating to disambiguate, Google requires Pro fields (`displayName`, `formattedAddress`) to show candidates [A3][P2]. Always bias by city (`searchRegion`/`locationBias`) and let the user confirm.
- Cost: Google Text Search with any readable field is Pro ($32/1k, 5,000 free/mo). Apple search is free up to 25k/day but yields name/address/coords only [A8].
- Rate limits: Apple daily cap returns 429; Google per-minute per-method quotas [A9][P5].
- Google `types` are useful (`restaurant`, `italian_restaurant`, ...); Apple has only `Restaurant` [A6][P2].

## 6. Share-sheet / PWA share target

- **Apple Maps share produces a URL.** iOS 18: `https://maps.apple.com/place?address=...&coordinate=lat,lng&name=...&place-id=I...`. iOS 26 devices briefly shared only `https://maps.apple/p/<short>`; Apple DTS said a rollback restoring prior payloads was rolling out [U2]. The short link 301-redirects (no auth) to the full URL with `name`, `address`, `coordinate`, `place-id` — verified with curl [U3]. `place-id` values feed `/v1/place/{id}` [A7]. Apple's official Maps URL doc only documents `q`, `ll`, `address`, `sll`, `z`, `t`, `saddr`, `daddr`, `dirflg`, `near`; `place-id`/`auid` are undocumented [U1].
- **Web Share Target on iOS Safari: not supported** as of 2026. WebKit bug 194593 is still NEW (last activity May 2026); WebKit standards position is "neutral" [W1][W2]. Safari supports outgoing Web Share only [W3]. An installed PWA cannot appear in the iOS share sheet.
- Workarounds: iOS Shortcut (accepts URL from share sheet -> POST to your API), or a paste box that accepts `maps.apple.com` / `maps.apple/p/` / Google Maps URLs and resolves server-side.

## Sources

- [A1] https://developer.apple.com/documentation/applemapsserverapi
- [A2] https://developer.apple.com/documentation/applemapsserverapi/-v1-search
- [A3] https://developer.apple.com/documentation/applemapsserverapi/place
- [A4] https://developer.apple.com/documentation/mapkitjs/place
- [A5] https://developer.apple.com/documentation/mapkitjs/placedetail
- [A6] https://developer.apple.com/documentation/applemapsserverapi/poicategory
- [A7] https://developer.apple.com/documentation/applemapsserverapi/-v1-place-:id
- [A8] https://developer.apple.com/maps/web/
- [A9] https://developer.apple.com/forums/thread/807656
- [S1] https://macnative.com/list-of-default-location-actions-for-ios-shortcuts/
- [G1] https://guides.apple.com/?ug=CgVHdWlkZRINCNkyENuVr4POz8aMcBIOCNkyEIGF9u3plOmIpQE%3D (decoded locally)
- [G2] https://blog.remeika.us/2020/01/19/the-apple-maps.html
- [G3] https://gotoapplemaps.com/guides/apple-maps-guides-complete-guide/
- [G4] https://discussions.apple.com/thread/255630908
- [U1] https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/MapLinks/MapLinks.html
- [U2] https://developer.apple.com/forums/thread/805396
- [U3] curl of https://maps.apple/p/U8rE9v8n8iVZjr and https://maps.apple.com/place?auid=... (2026-09-06)
- [P1] https://developers.google.com/maps/documentation/places/web-service/text-search
- [P2] https://developers.google.com/maps/documentation/places/web-service/place-details
- [P3] https://developers.google.com/maps/billing-and-pricing/pricing
- [P4] https://developers.google.com/maps/billing-and-pricing/march-2025
- [P5] https://developers.google.com/maps/documentation/places/web-service/usage-and-billing
- [P6] https://developers.google.com/maps/documentation/places/web-service/policies
- [P7] https://cloud.google.com/maps-platform/terms/maps-service-terms (s.14.3)
- [T1] https://gotoapplemaps.com/guides/export-google-maps-saved-places/
- [T2] https://www.takeout-tools.com/blog/google-takeout-saved-places-json-vs-csv
- [T3] https://github.com/rudokemper/google-maps-places-to-comaps
- [W1] https://bugs.webkit.org/show_bug.cgi?id=194593
- [W2] https://github.com/WebKit/standards-positions/issues/11
- [W3] https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target
