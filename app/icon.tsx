import { ImageResponse } from "next/og";

/**
 * Placeholder app icon — a plain wordmark, no design intent.
 * The look and feel is wayfinder ticket 06; this exists so the installed app has
 * a real 180x180 apple-touch-icon, which iOS requires.
 */
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1c1c1e",
          color: "#ffffff",
          fontSize: 280,
          fontWeight: 700,
          letterSpacing: -4,
        }}
      >
        R
      </div>
    ),
    size,
  );
}
