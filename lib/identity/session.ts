import { cookies } from "next/headers";

import {
  MEMBER_COOKIE,
  memberCookieOptions,
  readMemberToken,
  signMemberToken,
} from "./cookie-config";

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

/** "Not you?" — forget who this Device is. */
export async function releaseMember(): Promise<void> {
  (await cookies()).delete(MEMBER_COOKIE);
}



