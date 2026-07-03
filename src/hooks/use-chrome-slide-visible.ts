"use client";

import { useLayoutEffect, useState } from "react";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Paints the hidden state first, then triggers CSS transform + opacity on the
 * next frame so the browser interpolates a fluid slide + fade.
 */
export function useChromeSlideVisible(shown: boolean): boolean {
  const [visible, setVisible] = useState(false);

  useLayoutEffect(() => {
    let innerId = 0;
    const outerId = requestAnimationFrame(() => {
      if (!shown) {
        setVisible(false);
        return;
      }

      if (prefersReducedMotion()) {
        setVisible(true);
        return;
      }

      setVisible(false);
      innerId = requestAnimationFrame(() => {
        setVisible(true);
      });
    });

    return () => {
      cancelAnimationFrame(outerId);
      cancelAnimationFrame(innerId);
    };
  }, [shown]);

  return visible;
}
