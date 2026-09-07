import { cookies } from "next/headers";

import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  MEMBER_COOKIE,
  adminCookieOptions,
  memberCookieOptions,
  readAdminToken,
  readMemberToken,
  signMemberToken,
} from "./cookie-config";
import { sign } from "./token";

export * from "./cookie-config";

/**
 * The Member id this Device claims, or null. The id is signed, so a Device cannot
 * become another Member by editing storage — but this says nothing about whether
 * that Member still exists or has been archived. Callers that care must look them
 * up; `currentMember` in ./guard.ts does.
 */
export async function currentMemberId(): Promise<string | null> {
  const token = (await cookies()).get(MEMBER_COOKIE)?.value;
  return (await readMemberToken(token))?.m ?? null;
}

/** Claim a name on this Device. Only callable from a Server Action or Route Handler. */
export async function claimMember(memberId: string): Promise<void> {
  const store = await cookies();
  store.set(
    MEMBER_COOKIE,
    await signMemberToken(memberId),
    memberCookieOptions(),
  );
}

/** "Not you?" — forget who this Device is. The Admin unlock goes with it. */
export async function releaseMember(): Promise<void> {
  const store = await cookies();
  store.delete(MEMBER_COOKIE);
  store.delete(ADMIN_COOKIE);
}

export async function unlockAdmin(): Promise<void> {
  const token = await sign({
    adm: true as const,
    exp: Date.now() + ADMIN_COOKIE_MAX_AGE * 1000,
  });
  (await cookies()).set(ADMIN_COOKIE, token, adminCookieOptions());
}

export async function lockAdmin(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}

/**
 * Whether this Device currently holds an Admin unlock.
 *
 * Only half the check: it says the PIN was entered here, not that the current
 * Member is flagged as an Admin. `currentAdmin` in ./guard.ts does both.
 */
export async function hasAdminUnlock(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return (await readAdminToken(token)) !== null;
}
