/**
 * Cookie names, options and token shapes — deliberately free of `next/headers` so
 * that `proxy.ts`, which runs before rendering and may be deployed to the edge,
 * can import them.
 */
import { sign, verify } from "./token";

/** Who this Device is. */
export const MEMBER_COOKIE = "reso_member";
/** Whether this Device has entered the Admin PIN recently. */
export const ADMIN_COOKIE = "reso_admin";

/**
 * ~400 days. Installed iOS Home Screen web apps are exempt from ITP's website-data
 * removal (WebKit: "Home Screen Web Application Domain Exempt From ITP"), so a
 * cookie really does survive, and cookies are not subject to the quota-based
 * eviction that can take localStorage. See docs/research/ios-storage-persistence.md.
 */
export const MEMBER_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;

/** An Admin unlock lasts 30 days on that Device, sliding on each Admin action. */
export const ADMIN_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export type MemberToken = { m: string; iat: number };
export type AdminToken = { adm: true; exp: number };

export const baseCookie = {
  httpOnly: true,
  // Entry is a top-level navigation in from WhatsApp, so `strict` would drop the
  // cookie on the way in.
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  // Not scoped to /g/<secret>: identity has to outlive a rotation of the Group Link.
  path: "/",
} as const;

export function memberCookieOptions() {
  return { ...baseCookie, maxAge: MEMBER_COOKIE_MAX_AGE };
}

export function adminCookieOptions() {
  return { ...baseCookie, maxAge: ADMIN_COOKIE_MAX_AGE };
}

export async function signMemberToken(memberId: string): Promise<string> {
  return sign({ m: memberId, iat: Date.now() } satisfies MemberToken);
}

export async function readMemberToken(
  token: string | undefined,
): Promise<MemberToken | null> {
  const payload = await verify<MemberToken>(token);
  return payload && typeof payload.m === "string" ? payload : null;
}

export async function readAdminToken(
  token: string | undefined,
): Promise<AdminToken | null> {
  const payload = await verify<AdminToken>(token);
  return payload?.adm === true && Number(payload.exp) > Date.now()
    ? payload
    : null;
}
