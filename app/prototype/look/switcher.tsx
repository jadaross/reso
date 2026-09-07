"use client";

/* PROTOTYPE — throwaway. Wayfinder ticket 06. Not for production. */

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  SCREENS, SCREEN_LABEL, VARIANTS, VARIANT_NAME,
  type Screen, type Variant,
} from "./fixtures";

export function PrototypeSwitcher({
  variant,
  screen,
}: {
  variant: Variant;
  screen: Screen;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const go = (v: Variant, s: Screen) =>
    router.replace(`${pathname}?variant=${v}&screen=${s}`, { scroll: false });

  const cycle = (step: number) => {
    const i = VARIANTS.indexOf(variant);
    go(VARIANTS[(i + step + VARIANTS.length) % VARIANTS.length], screen);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft") cycle(-1);
      if (e.key === "ArrowRight") cycle(1);
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        const i = SCREENS.indexOf(screen);
        const step = e.key === "ArrowDown" ? 1 : -1;
        go(variant, SCREENS[(i + step + SCREENS.length) % SCREENS.length]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: 16,
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        alignItems: "center",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          background: "#101010",
          color: "#fff",
          borderRadius: 999,
          padding: 4,
          boxShadow: "0 6px 24px rgba(0,0,0,.35)",
        }}
      >
        <button onClick={() => cycle(-1)} style={arrow} aria-label="Previous variant">
          ‹
        </button>
        <span style={{ padding: "0 12px", fontSize: 13, whiteSpace: "nowrap" }}>
          {variant} — {VARIANT_NAME[variant]}
        </span>
        <button onClick={() => cycle(1)} style={arrow} aria-label="Next variant">
          ›
        </button>
      </div>
      <div
        style={{
          display: "flex",
          gap: 2,
          background: "#101010",
          borderRadius: 999,
          padding: 4,
          boxShadow: "0 6px 24px rgba(0,0,0,.35)",
        }}
      >
        {SCREENS.map((s) => (
          <button
            key={s}
            onClick={() => go(variant, s)}
            style={{
              ...arrow,
              width: "auto",
              padding: "0 10px",
              fontSize: 12,
              background: s === screen ? "#fff" : "transparent",
              color: s === screen ? "#101010" : "#9a9a9a",
            }}
          >
            {SCREEN_LABEL[s]}
          </button>
        ))}
      </div>
    </div>
  );
}

const arrow: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 999,
  border: "none",
  background: "transparent",
  color: "inherit",
  fontSize: 18,
  lineHeight: 1,
  cursor: "pointer",
};
