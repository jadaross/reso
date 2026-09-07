import { NextResponse, type NextRequest } from "next/server";

import {
  MEMBER_COOKIE,
  memberCookieOptions,
  readMemberToken,
} from "@/lib/identity/cookie-config";

/**
 * Slides the identity cookie forward on every request.
 *
 * This has to happen here rather than in a page: Next.js cannot set cookies during
 * Server Component rendering, only in Server Functions, Route Handlers or here. A
 * Member who opens Reso twice a month should never be asked who they are again, so
 * the ~400-day window is re-issued each time it is used rather than counting down
 * from the day they picked their name.
 *
 * Deliberately does no database work: whether the Group Link itself is still valid
 * is checked in app/g/[secret]/layout.tsx, where a query is cheap and cached.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  const token = request.cookies.get(MEMBER_COOKIE)?.value;
  if (token && (await readMemberToken(token))) {
    response.cookies.set(MEMBER_COOKIE, token, memberCookieOptions());
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
