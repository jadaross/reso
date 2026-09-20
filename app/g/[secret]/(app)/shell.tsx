import type { Member } from "@/lib/db/schema";

import { switchNameForm } from "./actions";
import { Frame } from "./frame";
import styles from "./shell.module.css";

/**
 * The frame every signed-in screen sits inside. Rendered once, by the layout.
 *
 * The Member's own name is permanent chrome, not a settings page: ticket 04
 * settled that names are not exclusive and a wrong tap is corrected by noticing
 * it, so the only defence against being signed in as Sienna is seeing "Sienna"
 * on every screen. Only Admins are shown the way into Admin; being an Admin is
 * what actually gates it, this just keeps a door nobody else can open out of
 * everyone else's way.
 */
export function Shell({
  secret,
  member,
  children,
}: {
  secret: string;
  member: Member;
  children: React.ReactNode;
}) {
  return (
    <Frame
      base={`/g/${secret}`}
      isAdmin={member.isAdmin}
      who={
        <form action={switchNameForm}>
          <input type="hidden" name="secret" value={secret} />
          <button type="submit" className={styles.who}>
            {member.name}
            <span className={styles.notYou}>Not you?</span>
          </button>
        </form>
      }
    >
      {children}
    </Frame>
  );
}

/**
 * The frame for screens shown before anyone has claimed a name: no navigation,
 * because there is nowhere to go until the app knows who you are.
 */
export function BareShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
