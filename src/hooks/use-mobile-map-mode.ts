"use client";

import { useSyncExternalStore } from "react";

const MOBILE_MAX_WIDTH_PX = 768;

function getIsMobileMapMode(): boolean {
  if (typeof window === "undefined") return false;

  const touchCapable = navigator.maxTouchPoints > 0;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const noHover = window.matchMedia("(hover: none)").matches;
  const narrowViewport = window.innerWidth <= MOBILE_MAX_WIDTH_PX;

  return narrowViewport && touchCapable && (coarsePointer || noHover);
}

function subscribe(onStoreChange: () => void): () => void {
  const queries = [
    window.matchMedia("(hover: none)"),
    window.matchMedia("(pointer: coarse)"),
    window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH_PX}px)`),
  ];

  for (const query of queries) {
    query.addEventListener("change", onStoreChange);
  }
  window.addEventListener("resize", onStoreChange);
  window.addEventListener("orientationchange", onStoreChange);

  return () => {
    for (const query of queries) {
      query.removeEventListener("change", onStoreChange);
    }
    window.removeEventListener("resize", onStoreChange);
    window.removeEventListener("orientationchange", onStoreChange);
  };
}

/** True on phones / coarse-pointer touch devices and narrow viewports. */
export function useMobileMapMode(): boolean {
  return useSyncExternalStore(subscribe, getIsMobileMapMode, () => false);
}
