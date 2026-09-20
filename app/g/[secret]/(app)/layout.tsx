import { currentMember } from "@/lib/identity/guard";

import { BareShell, Shell } from "./shell";

/**
 * The frame around every signed-in screen: the name at the top, the tab bar at
 * the bottom, and the scrolling area between them.
 *
 * It lives in a layout, not in each page, so that switching tabs swaps only the
 * content. When every page drew its own header and tab bar, each navigation tore
 * the whole frame down and put it back, which read as a flicker — and a page the
 * phone had cached from before a deploy could come back wearing an older bar.
 *
 * The route group keeps the setup screen (/start) outside this frame: there is
 * exactly one thing to do there and no tabs to wander off to.
 */
export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  const member = await currentMember();

  if (!member) return <BareShell>{children}</BareShell>;

  return (
    <Shell secret={secret} member={member}>
      {children}
    </Shell>
  );
}
