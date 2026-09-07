/**
 * Pulling what we can out of a pasted Apple or Google Maps link, with no paid API.
 *
 * Everything here is undocumented and parsed at our own risk — Apple's own guidance
 * is that these URLs are "not intended to be parsed". So every field is optional,
 * the caller always keeps the typed name, and the raw link is stored verbatim so a
 * failed parse can be retried later. See docs/research/maps-link-parsing.md.
 */

export type LinkSource = "apple" | "google" | "unknown";

export type ParsedPlace = {
  source: LinkSource;
  name: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  externalPlaceId: string | null;
};

const APPLE_HOSTS = new Set(["maps.apple.com", "maps.apple", "beta.maps.apple.com"]);
const GOOGLE_SHORT_HOSTS = new Set(["maps.app.goo.gl", "goo.gl"]);
const GOOGLE_HOST = /^((www|maps)\.)?google(\.[a-z]{2,3}){1,2}$/;

export function classifyHost(host: string): LinkSource {
  const hostname = host.toLowerCase();
  if (APPLE_HOSTS.has(hostname)) return "apple";
  if (GOOGLE_SHORT_HOSTS.has(hostname) || GOOGLE_HOST.test(hostname)) {
    return "google";
  }
  return "unknown";
}

/** Only these hosts are ever fetched, and only over https — this is the SSRF gate. */
export function isFetchableUrl(raw: string): boolean {
  const url = safeUrl(raw);
  return (
    url !== null && url.protocol === "https:" && classifyHost(url.host) !== "unknown"
  );
}

/** True for the short forms that have to be resolved before anything can be read. */
export function isShortLink(raw: string): boolean {
  const url = safeUrl(raw);
  if (!url) return false;
  if (GOOGLE_SHORT_HOSTS.has(url.host.toLowerCase())) return true;
  // maps.apple/p/<short>
  return url.host.toLowerCase() === "maps.apple" && url.pathname.startsWith("/p/");
}

export function safeUrl(raw: string): URL | null {
  try {
    return new URL(raw.trim());
  } catch {
    return null;
  }
}

const EMPTY: ParsedPlace = {
  source: "unknown",
  name: null,
  address: null,
  lat: null,
  lng: null,
  externalPlaceId: null,
};

export function parsePlaceUrl(raw: string): ParsedPlace {
  const url = safeUrl(raw);
  if (!url) return EMPTY;

  switch (classifyHost(url.host)) {
    case "apple":
      return parseAppleUrl(url);
    case "google":
      return parseGoogleUrl(url);
    default:
      return EMPTY;
  }
}

/**
 * Apple is the good case: name, address and coordinates all sit in the query string
 * of the resolved `maps.apple.com/place?...` URL, so nothing needs scraping.
 */
export function parseAppleUrl(url: URL): ParsedPlace {
  const query = url.searchParams;
  const coordinate = query.get("coordinate") ?? query.get("ll") ?? query.get("sll");
  const [lat, lng] = splitCoordinate(coordinate);

  return {
    source: "apple",
    name: clean(query.get("name") ?? query.get("q")),
    address: clean(query.get("address")),
    lat,
    lng,
    externalPlaceId: clean(query.get("place-id") ?? query.get("auid")),
  };
}

/**
 * Google gives a name and the pin's coordinates from the resolved URL, and nothing
 * else — the HTML is a JS shell whose og:title is just "Google Maps", with no
 * address anywhere. An address needs a paid API, so we do not try.
 */
export function parseGoogleUrl(url: URL): ParsedPlace {
  const path = decodeURIComponent(url.pathname);

  const nameMatch = path.match(/\/place\/([^/@]+)/);
  const name = nameMatch ? clean(nameMatch[1].replace(/\+/g, " ")) : null;

  // !3d/!4d are the place pin. The @lat,lng earlier in the path is only the map
  // viewport centre, which can sit streets away, so it is a last resort.
  const source = `${path}${url.search}`;
  const pinLat = source.match(/!3d(-?\d+(?:\.\d+)?)/);
  const pinLng = source.match(/!4d(-?\d+(?:\.\d+)?)/);

  let lat = pinLat ? Number(pinLat[1]) : null;
  let lng = pinLng ? Number(pinLng[1]) : null;

  if (lat === null || lng === null) {
    const viewport = path.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (viewport) {
      lat = Number(viewport[1]);
      lng = Number(viewport[2]);
    }
  }

  const ftid = source.match(/[!?&]?(?:ftid=|1s)(0x[0-9a-f]+:0x[0-9a-f]+)/i);

  return {
    source: "google",
    name,
    address: null,
    lat: validCoordinate(lat, 90),
    lng: validCoordinate(lng, 180),
    externalPlaceId: ftid ? ftid[1] : null,
  };
}

function splitCoordinate(value: string | null): [number | null, number | null] {
  if (!value) return [null, null];
  const [lat, lng] = value.split(",").map((part) => Number(part.trim()));
  return [validCoordinate(lat, 90), validCoordinate(lng, 180)];
}

function validCoordinate(value: number | null, bound: number): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  return Math.abs(value) <= bound ? value : null;
}

function clean(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed.slice(0, 300) : null;
}
