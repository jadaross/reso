# Extracting name, address and coordinates from pasted Maps links without an API

Type: research
Status: resolved
Blocked by: —

## Question

A Member pastes a link copied from Apple Maps or Google Maps on their iPhone. Without any paid API, what can the server reliably extract? Cover: Apple `maps.apple.com/place?...` and `maps.apple/p/<short>` links (query params after redirect), Google `maps.app.goo.gl/<short>` and `google.com/maps/place/...` links (what the redirected URL and the HTML `og:title` / `og:description` expose), what a server-side fetch from a Vercel function needs (user-agent, redirects, bot blocking), and how brittle each is. `docs/research/restaurant-import.md` §1 and §6 already cover the Apple side partially; extend it and verify the Google side with real links. Recommend a parsing strategy and a fallback when extraction fails (keep the typed name, store the raw link).

Findings go in `docs/research/maps-link-parsing.md`.

## Answer

- Apple: `maps.apple/p/<short>` 301s (no UA needed) to `maps.apple.com/place?name=…&address=…&coordinate=lat,lng&place-id=I…`, so name, address, lat/lng and place-id all come from the query string; the place page adds `og:title`, `og:image` `center=lat,lng` and a `shell-props` JSON blob with structured address, phone and hours. All undocumented (Apple DTS: "not intended to be parsed"), but no bot blocking and clean 404s.
- Google: `maps.app.goo.gl/<short>` 302s (HEAD is enough; plain/Node UA works, a desktop Chrome UA gets a JS shell instead) to `/maps/place/<Name>/@…/data=…!3d<lat>!4d<lng>…`; name and pin lat/lng (use `!3d/!4d`, not `@`) plus an FTID/CID come from that URL only. The HTML is useless (`og:title` = "Google Maps", no address, no ChIJ id), and UK/EU egress hits a consent.google.com bounce (bypass with `Cookie: SOCS=CAI`).
- Vercel function: allow-list hosts (SSRF), `fetch(..., {redirect:'manual'})` and follow Location yourself, 5 s timeout, cap body size, skip the body for Google.
- Strategy: parse the URL first, resolve short links with one manual-redirect request, optionally enrich Apple from the place page; Google gives no address without an API (optional free Nominatim reverse-geocode).
- Fallback: on any miss keep the typed name, store `raw_link` verbatim (always), mark unresolved for later re-parse.

Findings: docs/research/maps-link-parsing.md
