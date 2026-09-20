"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import styles from "./shell.module.css";

const TABS = [
  { path: "", label: "Month" },
  { path: "/free", label: "Free" },
  { path: "/restaurants", label: "Restaurants" },
  { path: "/history", label: "History" },
] as const;

const SetEyebrow = createContext<(text: string) => void>(() => {});

/**
 * The persistent chrome, on the client so it can follow the URL.
 *
 * Which tab is lit comes from the pathname rather than from a prop each page
 * passes, because the pages are what change under this frame and the frame is
 * what stays. The scrolling happens inside <main>, not on the body: a bar fixed
 * to the bottom of a page that scrolls on the body is exactly the thing iOS
 * Safari leaves stranded mid-screen when the toolbar collapses.
 */
export function Frame({
  base,
  who,
  isAdmin,
  children,
}: {
  /** The Group Link path, `/g/<secret>`. */
  base: string;
  /** The name-and-"Not you?" form, rendered on the server. */
  who: React.ReactNode;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [eyebrow, setEyebrow] = useState("");
  const main = useRef<HTMLElement>(null);

  // A new page starts at the top; the scroll position is main's, not the body's.
  useEffect(() => {
    main.current?.scrollTo(0, 0);
  }, [pathname]);

  const onSettings = pathname === `${base}/settings`;

  return (
    <SetEyebrow.Provider value={setEyebrow}>
      <div className={styles.shell}>
        <header className={styles.header}>
          {who}
          <span className={styles.eyebrow}>
            {eyebrow}
            {eyebrow ? " · " : ""}
            <Link
              href={`${base}/settings`}
              className={styles.headerLink}
              aria-current={onSettings ? "page" : undefined}
            >
              Settings
            </Link>
            {isAdmin ? (
              <>
                {" · "}
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
    </SetEyebrow.Provider>
  );
}

/**
 * Short context for the top right — the month and its tier, how many places.
 * A page renders one of these; the frame shows it and clears it when the page
 * goes.
 */
export function Eyebrow({ text }: { text: string }) {
  const set = useContext(SetEyebrow);
  useEffect(() => {
    set(text);
    return () => set("");
  }, [text, set]);
  return null;
}
