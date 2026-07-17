"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// A brief, deliberate fade + settle on every route change, so navigation
// reads as unhurried rather than an instant snap between pages.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.4s ease-in-out, transform 0.4s ease-in-out",
      }}
    >
      {children}
    </div>
  );
}
