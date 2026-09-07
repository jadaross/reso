import {
  classifyHost,
  isFetchableUrl,
  isShortLink,
  parsePlaceUrl,
  safeUrl,
  type ParsedPlace,
} from "./parse";

const TIMEOUT_MS = 5_000;
const MAX_REDIRECTS = 5;

/**
 * Google bounces UK and EU egress through a consent interstitial. This is the
 * documented opt-out cookie and is enough to get the real redirect.
 */
const GOOGLE_CONSENT_COOKIE = "SOCS=CAI";

/**
 * A plain Node user-agent gets the real redirect out of Google. A desktop Chrome
 * one gets a JavaScript shell instead, which is useless to us.
 */
const USER_AGENT = "Reso/1.0 (+https://github.com/jadaross/reso)";

/**
 * Resolve a pasted Maps link into whatever we can get.
 *
 * Redirects are followed by hand rather than by `fetch`, so that every hop can be
 * checked against the host allow-list — otherwise a short link is an open redirect
 * into our own network. Only the final URL is ever parsed; no page body is
 * downloaded, which also sidesteps Google's HTML being a JS shell.
 */
export async function resolvePlaceLink(raw: string): Promise<ParsedPlace | null> {
  if (!isFetchableUrl(raw)) return null;

  const finalUrl = isShortLink(raw) ? await followRedirects(raw) : raw;
  if (!finalUrl) return null;

  const parsed = parsePlaceUrl(finalUrl);
  // A parse with nothing in it is worse than useless: it would overwrite the name
  // the Member typed with null.
  return parsed.name || parsed.lat !== null ? parsed : null;
}

async function followRedirects(start: string): Promise<string | null> {
  let current = start;

  for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
    if (!isFetchableUrl(current)) return null;

    const url = safeUrl(current);
    if (!url) return null;

    const response = await fetchOnce(url);
    if (!response) return null;

    const location = response.headers.get("location");
    if (!location) {
      // Not a redirect — this is as far as the chain goes.
      return response.status < 400 ? current : null;
    }

    const next = safeUrl(new URL(location, url).toString());
    if (!next) return null;
    current = next.toString();
  }

  return null;
}

/**
 * One hop, HEAD first and GET as a fallback.
 *
 * HEAD is enough to read a Location header and downloads no body, which is the
 * whole reason it is tried first. But these are undocumented endpoints behind a
 * CDN, and a CDN that answers GET will sometimes refuse HEAD from an unfamiliar
 * client or edge — so a failed HEAD is retried once as a GET before giving up on
 * the link. The body is never read either way.
 */
async function fetchOnce(url: URL): Promise<Response | null> {
  const head = await attempt(url, "HEAD");
  if (head && (head.status < 400 || head.headers.get("location"))) return head;
  return attempt(url, "GET");
}

async function attempt(url: URL, method: "HEAD" | "GET"): Promise<Response | null> {
  const headers: Record<string, string> = { "user-agent": USER_AGENT };
  if (classifyHost(url.host) === "google") {
    headers.cookie = GOOGLE_CONSENT_COOKIE;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    return await fetch(url, {
      method,
      redirect: "manual",
      headers,
      signal: controller.signal,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
