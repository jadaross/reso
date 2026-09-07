import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Reso",
  description: "Where are we eating this month?",
  // Tells iOS to run as a standalone app rather than a Safari tab, and to leave
  // the status bar readable over the page.
  appleWebApp: {
    capable: true,
    title: "Reso",
    statusBarStyle: "default",
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
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
