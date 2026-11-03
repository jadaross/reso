import { isGroupSecret } from "./token";

/**
 * What a missing page says.
 *
 * It never looks at the URL it was reached from. A browser that has not already
 * come in through the Group Link sees one sentence — the same one the root page
 * gives — whether the secret was wrong or the path was. The two stay
 * indistinguishable. Once this browser has opened a live Group Link, that visit
 * is what points "Back to dinner" home.
 */
export const STRAY_EXPLANATION =
  "A private site for one group of friends. If you are one of them, open the link from the group chat.";

export type NotFoundView =
  | { title: "Nothing here."; backHref: string }
  | { title: "Nothing here."; explanation: string };

export function notFoundView(groupSecret: string | null): NotFoundView {
  if (groupSecret && isGroupSecret(groupSecret)) {
    return { title: "Nothing here.", backHref: `/g/${groupSecret}` };
  }
  return { title: "Nothing here.", explanation: STRAY_EXPLANATION };
}

/**
 * Screens under a Group Link. The old Places and Past URLs stay here so a
 * bookmark still counts as coming in while it redirects.
 */
const SCREENS = new Set([
  "start",
  "dates",
  "places",
  "past",
  "restaurants",
  "history",
  "admin",
  "free",
  "settings",
]);

/** The Group Link secret when this path is one of the app's screens, else null. */
export function groupSecretOnScreen(pathname: string): string | null {
  const path = pathname.split(/[?#]/, 1)[0]?.replace(/\/+$/, "") ?? "";
  const match = /^\/g\/([^/]+)(?:\/([^/]+))?$/.exec(path);
  if (!match) return null;

  const secret = match[1] ?? "";
  const screen = match[2] ?? "";
  if (!isGroupSecret(secret)) return null;
  if (screen !== "" && !SCREENS.has(screen)) return null;
  return secret;
}
