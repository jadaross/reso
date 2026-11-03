import { connection } from "next/server";
import Link from "next/link";

import { currentGroupSecret } from "@/lib/identity/session";
import { notFoundView } from "@/lib/identity/not-found";

import styles from "./not-found.module.css";

/**
 * The only missing-page screen. Root layout supplies the field and the fonts,
 * so this never falls through to the framework's white 404.
 */
export default async function NotFound() {
  await connection();
  const view = notFoundView(await currentGroupSecret());

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{view.title}</h1>
      {"backHref" in view ? (
        <Link href={view.backHref} className={styles.back}>
          Back to dinner →
        </Link>
      ) : (
        <p className={styles.explanation}>{view.explanation}</p>
      )}
    </main>
  );
}
