"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import styles from "./shell.module.css";

const TABS = [
  { path: "", label: "Dinner" },
  { path: "/dates", label: "Dates" },
  { path: "/places", label: "Places" },
  { path: "/past", label: "Past" },
] as const;

/**
 * The persistent chrome, on the client so it can follow the URL.
 *
 * Which tab is lit comes from the pathname rather than from a prop each page
 * passes, because the pages are what change under this frame and the frame is
 * what stays. The scrolling happens inside <main>, not on the body: a bar fixed
 * to the bottom of a page that scrolls on the body is exactly the thing iOS
 * Safari leaves stranded mid-screen when the toolbar collapses.
 *
 * The top-right slot is the current Outing — its month and Price Tier — and it
 * does not change with the tab. The Admin link sits beside it.
 */
export function Frame({
  base,
  who,
  isAdmin,
  slot,
  children,
}: {
  /** The Group Link path, `/g/<secret>`. */
  base: string;
  /** The name-and-"Not you?" form, rendered on the server. */
  who: React.ReactNode;
  isAdmin: boolean;
  /** "Nov · ££", or "Nov · dinner party". Empty when the Group has no Outing yet. */
  slot: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const main = useRef<HTMLElement>(null);

  // A new page starts at the top; the scroll position is main's, not the body's.
  useEffect(() => {
    main.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        {who}
        <span className={styles.eyebrow}>
          {slot}
          {isAdmin ? (
            <>
              {slot ? " · " : ""}
              <Link href={`${base}/admin`} className={styles.adminLink}>
                Admin
              </Link>
            </>
          ) : null}
        </span>
      </header>

      <main ref={main} className={styles.main}>
        {children}
      </main>

      <nav className={styles.nav} aria-label="Sections">
        {TABS.map((tab) => {
          const href = `${base}${tab.path}`;
          const on = pathname === href;
          return (
            <Link
              key={tab.label}
              href={href}
              className={on ? `${styles.tab} ${styles.tabOn}` : styles.tab}
              aria-current={on ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
