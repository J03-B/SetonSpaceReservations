"use client";

import {
  chromeIsInteractive,
  chromeSlideMotionClass,
  chromeSlideStyle,
  MAP_FLOOR_INSET,
  type ChromeMotionMode,
} from "@/components/map/map-chrome-motion";
import type { FloorControlMeta } from "./map-navigation-bar";
import { cn } from "@/lib/utils";

interface FloorSwitcherProps {
  control: FloorControlMeta;
  visible: boolean;
  chromeMotionMode: ChromeMotionMode;
  onUp: () => void;
  onDown: () => void;
  embedded?: boolean;
}

export function FloorSwitcher({
  control,
  visible,
  chromeMotionMode,
  onUp,
  onDown,
  embedded = false,
}: FloorSwitcherProps) {
  const interactive = chromeIsInteractive(visible);

  return (
    <div
      className={
        embedded
          ? "pointer-events-none flex items-center"
          : "pointer-events-none absolute right-4 z-50 flex items-center"
      }
      style={
        embedded
          ? undefined
          : { top: MAP_FLOOR_INSET, bottom: MAP_FLOOR_INSET }
      }
    >
      <div
        className={embedded ? undefined : chromeSlideMotionClass}
        style={
          embedded
            ? undefined
            : chromeSlideStyle(visible, "x-end", chromeMotionMode)
        }
      >
        <div
          className={cn(
            "flex flex-col items-center gap-1 rounded-xl border border-border bg-surface/97 px-2 py-2 shadow-lg backdrop-blur-sm",
            interactive ? "pointer-events-auto" : "pointer-events-none",
          )}
          aria-label="Building floors"
          aria-hidden={!interactive}
        >
          <button
            type="button"
            aria-label="Go up a floor"
            disabled={!interactive || !control.canUp}
            onClick={onUp}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-surface text-text-primary hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="size-5"
            >
              <path
                d="M6 14L12 8L18 14"
                stroke="currentColor"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className="flex min-w-9 flex-col items-center py-1" aria-live="polite">
            <span className="text-xl font-semibold leading-none text-text-primary">
              {control.current}
            </span>
            <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-text-secondary">
              Floor
            </span>
          </div>
          <button
            type="button"
            aria-label="Go down a floor"
            disabled={!interactive || !control.canDown}
            onClick={onDown}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-surface text-text-primary hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="size-5"
            >
              <path
                d="M6 10L12 16L18 10"
                stroke="currentColor"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
