import { NextResponse, type NextRequest } from "next/server";

import {
  GROUP_LINK_COOKIE,
  groupLinkCookieOptions,
  MEMBER_COOKIE,
  memberCookieOptions,
  readMemberToken,
  signGroupLink,
} from "@/lib/identity/cookie-config";
import { checkGroupSecret } from "@/lib/identity/group-link";
import { groupSecretOnScreen } from "@/lib/identity/not-found";

/**
 * Slides two cookies forward.
 *
 * The identity cookie is re-issued on every request so a Member who opens Reso
 * twice a month is never asked who they are again. Next.js cannot set cookies
 * during Server Component rendering, only in a Server Function, a Route Handler,
 * or here, so the ~400-day window is renewed each time it is used.
 *
 * The Group Link cookie is set only for a real screen on a live Group Link. A
 * mistyped path does not qualify, and the not-found page never reads the URL, so
 * the response cannot be used to tell a wrong secret from a wrong path.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  const token = request.cookies.get(MEMBER_COOKIE)?.value;
  if (token && (await readMemberToken(token))) {
    response.cookies.set(MEMBER_COOKIE, token, memberCookieOptions());
  }

  const secret = groupSecretOnScreen(request.nextUrl.pathname);
  if (secret && (await checkGroupSecret(secret)) === "ok") {
    response.cookies.set(
      GROUP_LINK_COOKIE,
      await signGroupLink(secret),
      groupLinkCookieOptions(),
    );
  }

  return response;
}

export const config = {
  // Everything except Next's own assets, the service worker, and the icons the
  // installed app fetches. Without this the refresh would run for every static file.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)",
  ],
};
