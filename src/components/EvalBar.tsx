"use client";

import { useEffect, useRef, useState } from "react";

type EvalBarProps = {
  scoreCpWhite: number | null;
  scoreMateWhite: number | null;
  orientation: "white" | "black";
  heightPx?: number;
};

function cpToWhitePct(cp: number): number {
  // Squash into 0..1 so a big material swing doesn't just peg the bar at the extreme.
  const fraction = 1 / (1 + Math.exp(-cp / 300));
  return Math.min(97, Math.max(3, fraction * 100));
}

export function EvalBar({ scoreCpWhite, scoreMateWhite, orientation, heightPx = 480 }: EvalBarProps) {
  // Smoothly tween the displayed number/bar toward the latest engine value
  // instead of snapping, so live updates visibly rise and fall like chess.com.
  const [displayCp, setDisplayCp] = useState(scoreCpWhite ?? 0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    if (scoreMateWhite != null) return;

    const target = scoreCpWhite ?? 0;
    const startValue = displayCp;
    let startTime: number | null = null;
    const duration = 500;

    const step = (now: number) => {
      if (startTime == null) startTime = now;
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayCp(startValue + (target - startValue) * eased);
      if (t < 1) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoreCpWhite, scoreMateWhite]);

  let whitePct: number;
  let label: string;

  if (scoreMateWhite != null) {
    whitePct = scoreMateWhite > 0 ? 97 : 3;
    label = scoreMateWhite > 0 ? `M${scoreMateWhite}` : `M${Math.abs(scoreMateWhite)}`;
  } else {
    whitePct = cpToWhitePct(displayCp);
    const pawns = (displayCp / 100).toFixed(1);
    label = displayCp >= 0 ? `+${pawns}` : pawns;
  }

  const whiteAtBottom = orientation === "white";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="relative w-6 overflow-hidden"
        style={{
          height: heightPx,
          border: "1px solid var(--color-gold-soft)",
          background: "#1a1108",
        }}
      >
        <div
          className="absolute left-0 right-0"
          style={{
            background: "var(--color-cream)",
            transition: `height ${"var(--motion-duration)"} var(--motion-ease)`,
            ...(whiteAtBottom ? { bottom: 0, height: `${whitePct}%` } : { top: 0, height: `${whitePct}%` }),
          }}
        />
      </div>
      <span
        className="text-xs font-bold"
        style={{ fontFamily: "var(--font-ui)", color: "var(--color-text-muted)" }}
      >
        {label}
      </span>
    </div>
  );
}
