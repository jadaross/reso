import { ImageResponse } from "next/og";

import { Icon } from "./apple-icon";

/** The same ticket as the Home Screen icon, at the size browsers and Android want. */
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function AppIcon() {
  return new ImageResponse(<Icon scale={512 / 180} />, size);
}
