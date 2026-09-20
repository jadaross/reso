import Link from "next/link";

import type { Member } from "@/lib/db/schema";

import { switchNameForm } from "./actions";
import styles from "./shell.module.css";

export type Section = "month" | "restaurants" | "history" | "settings";

/**
 * The frame every signed-in screen sits inside.
 *
 * The Member's own name is permanent chrome, not a settings page: ticket 04
 * settled that names are not exclusive and a wrong tap is corrected by noticing
 * it, so the only defence against being signed in as Sienna is seeing "Sienna"
 * on every screen.
 */
export function Shell({
  secret,
  member,
  section,
  eyebrow,
  children,
}: {
  secret: string;
  member: Member;
  section: Section;
  /** Short context for the top-right, e.g. the month and its tier. */
  eyebrow?: string;
  children: React.ReactNode;
}) {
  // Only Admins are shown the way in. The PIN is what actually gates it; this just
  // keeps a door nobody else can open out of everyone else's way.
  const adminHref = member.isAdmin ? `/g/${secret}/admin` : null;
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <form action={switchNameForm}>
          <input type="hidden" name="secret" value={secret} />
          <button type="submit" className={styles.who}>
            {member.name}
            <span className={styles.notYou}>Not you?</span>
          </button>
        </form>
        <span className={styles.eyebrow}>
          {eyebrow}
          {adminHref ? (
            <>
              {eyebrow ? " · " : ""}
              <Link href={adminHref} className={styles.adminLink}>
                Admin
              </Link>
            </>
          ) : null}
        </span>
      </header>

      <main className={styles.main}>{children}</main>

      <nav className={styles.nav} aria-label="Sections">
        <Tab href={`/g/${secret}`} label="Month" on={section === "month"} />
        <Tab
          href={`/g/${secret}/restaurants`}
          label="Restaurants"
          on={section === "restaurants"}
        />
        <Tab
          href={`/g/${secret}/history`}
          label="History"
          on={section === "history"}
        />
        <Tab
          href={`/g/${secret}/settings`}
          label="Settings"
          on={section === "settings"}
        />
      </nav>
    </div>
  );
}

function Tab({ href, label, on }: { href: string; label: string; on: boolean }) {
  return (
    <Link
      href={href}
      className={on ? `${styles.tab} ${styles.tabOn}` : styles.tab}
      aria-current={on ? "page" : undefined}
    >
      {label}
    </Link>
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
