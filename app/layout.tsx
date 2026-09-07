import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter_Tight } from "next/font/google";

import "./globals.css";

/*
 * Self-hosted rather than pulled from Google at runtime: the installed Home Screen
 * app has to render correctly with no network, and a third-party font request on
 * first paint is exactly the thing that makes a web app feel like a web page.
 */
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-bricolage",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter-tight",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Reso",
  description: "Where are we eating this month?",
  // Tells iOS to run as a standalone app rather than a Safari tab, and to leave
  // the status bar readable over the page.
  appleWebApp: {
    capable: true,
    title: "Reso",
    statusBarStyle: "black-translucent",
  },
  // Reso is a private site behind a secret link; it should never be indexed.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets the app paint under the notch and the home indicator once it is
  // installed; without it the standalone app is letterboxed.
  viewportFit: "cover",
  // Matches --field, so the browser chrome and the app agree from the first frame.
  themeColor: "#0e1116",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" className={`${bricolage.variable} ${interTight.variable}`}>
      <body>{children}</body>
    </html>
  );
}
