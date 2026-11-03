import { STRAY_EXPLANATION } from "@/lib/identity/not-found";

/**
 * The root has nothing to show: the whole app lives under /g/<secret>, and the
 * Group Link is the only way in. This is what a stray visit sees.
 */
export default function Home() {
  return (
    <main style={{ padding: "40px 20px", maxWidth: "34ch", margin: "0 auto" }}>
      <h1>Reso</h1>
      <p style={{ color: "#7a8391" }}>{STRAY_EXPLANATION}</p>
    </main>
  );
}
