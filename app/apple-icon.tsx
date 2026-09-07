import { ImageResponse } from "next/og";

/**
 * The Home Screen icon: a bone ticket, torn, on the app's own field.
 *
 * Six people will find this among a hundred other icons, so it is a shape rather
 * than a letter — the tear line reads at 60px where a wordmark would not. Colours
 * are the tokens from wayfinder ticket 06, so the icon, the launch screen and the
 * first paint are all the same near-black.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<Icon scale={1} />, size);
}

export function Icon({ scale }: { scale: number }) {
  const s = (n: number) => Math.round(n * scale);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0e1116",
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          width: s(112),
          height: s(84),
          borderRadius: s(10),
          background: "#efebe1",
        }}
      >
        {/* The tear line, and the two notches bitten out of each edge. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: s(46),
            height: s(3),
            background: "#f0a83c",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: s(-9),
            top: s(38),
            width: s(18),
            height: s(18),
            borderRadius: s(9),
            background: "#0e1116",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: s(-9),
            top: s(38),
            width: s(18),
            height: s(18),
            borderRadius: s(9),
            background: "#0e1116",
          }}
        />
      </div>
    </div>
  );
}
