"use client";

import { useSyncExternalStore } from "react";

/** Reference layout — 1920×1080 (16:9 landscape) */
const TARGET_ASPECT = 16 / 9;
/** How far from 16:9 we still allow (4:3-ish through ultrawide) */
const ASPECT_TOLERANCE = 0.42;

function getViewportAspect(): { width: number; height: number; aspect: number } {
  const width = window.visualViewport?.width ?? window.innerWidth;
  const height = window.visualViewport?.height ?? window.innerHeight;
  const aspect = height > 0 ? width / height : 0;
  return { width, height, aspect };
}

function getIsUnsupportedScreen(): boolean {
  if (typeof window === "undefined") return false;

  const { width, height, aspect } = getViewportAspect();
  if (width <= 0 || height <= 0) return true;

  // Portrait — taller than wide (e.g. phone 1206×2622)
  if (aspect < 1) return true;

  const aspectDelta = Math.abs(aspect - TARGET_ASPECT) / TARGET_ASPECT;
  return aspectDelta > ASPECT_TOLERANCE;
}

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener("resize", onStoreChange);
  window.addEventListener("orientationchange", onStoreChange);
  window.visualViewport?.addEventListener("resize", onStoreChange);

  return () => {
    window.removeEventListener("resize", onStoreChange);
    window.removeEventListener("orientationchange", onStoreChange);
    window.visualViewport?.removeEventListener("resize", onStoreChange);
  };
}

function useUnsupportedScreen(): boolean {
  return useSyncExternalStore(subscribe, getIsUnsupportedScreen, () => false);
}

const SUPPORT_EMAIL = "semperjoey@gmail.com";

export function UnsupportedScreenGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const unsupported = useUnsupportedScreen();

  if (!unsupported) {
    return children;
  }

  return (
    <>
      <div aria-hidden="true" className="pointer-events-none select-none opacity-0">
        {children}
      </div>

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsupported-screen-title"
        aria-describedby="unsupported-screen-description"
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-surface-subtle p-6"
      >
        <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 text-center shadow-lg">
          <h1
            id="unsupported-screen-title"
            className="text-xl font-semibold text-text-primary"
          >
            Screen not supported
          </h1>
          <p
            id="unsupported-screen-description"
            className="mt-4 text-sm leading-relaxed text-text-secondary"
          >
            This site needs a landscape screen (similar to 1920×1080). Please rotate
            your device or use a wider display. Contact{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-medium text-action-primary underline"
            >
              {SUPPORT_EMAIL}
            </a>{" "}
            for more information.
          </p>
        </div>
      </div>
    </>
  );
}
