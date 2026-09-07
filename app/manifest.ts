import type { MetadataRoute } from "next";

/**
 * Note what is NOT here: `start_url`.
 *
 * Omitting it makes iOS launch the installed app at whichever page it was added
 * from — which is /g/<secret>, the only URL that carries the Group Link. With a
 * start_url of "/", every Home Screen icon would open a page the installed app
 * sees with an empty cookie jar and no way back in. See ticket 03 and
 * docs/research/pwa-and-web-push.md.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Reso",
    short_name: "Reso",
    description: "Where are we eating this month?",
    display: "standalone",
    orientation: "portrait",
    // Both match --field in globals.css, so the launch screen, the browser chrome
    // and the app itself agree from the first frame. Decided in ticket 06.
    background_color: "#0e1116",
    theme_color: "#0e1116",
    icons: [
      { src: "/icon", sizes: "192x192", type: "image/png" },
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
