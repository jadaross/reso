import { notFound } from "next/navigation";

import { checkGroupSecret } from "@/lib/identity/group-link";
import { currentMemberId } from "@/lib/identity/session";

/**
 * The whole app lives under /g/<secret>, and never redirects away from it.
 *
 * That is not decoration: iOS adds to the Home Screen whatever page you are
 * currently on, and the manifest deliberately omits `start_url` so the installed
 * app launches there. Redirecting to `/` would leave every icon pointing at a page
 * the installed app opens with an empty cookie jar and no secret. See ticket 03.
 */
export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  const state = await checkGroupSecret(secret);

  if (state === "unknown") notFound();

  if (state === "revoked" && !(await currentMemberId())) {
    return (
      <main>
        <h1>This link has been replaced</h1>
        <p>
          Ask whoever runs Reso for the new one. If you already had Reso on your
          Home Screen, open it from there instead — it still works.
        </p>
      </main>
    );
  }

  return <>{children}</>;
}
