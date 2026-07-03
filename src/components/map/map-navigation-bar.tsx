"use client";

import {
  chromeIsInteractive,
  chromeSlideMotionClass,
  chromeSlideStyle,
  type ChromeMotionMode,
} from "@/components/map/map-chrome-motion";
import { cn } from "@/lib/utils";

export interface MapNavigationBreadcrumb {
  id: string;
  title: string;
}

export interface MapNavigationMeta {
  breadcrumbs: MapNavigationBreadcrumb[];
  canGoBack: boolean;
  isTransitioning: boolean;
  chromeShown: boolean;
  chromeMotionMode: ChromeMotionMode;
}

export interface MapNavigationActions {
  onBack: () => void;
  onNavigateToIndex: (index: number) => void;
}

interface MapNavigationBarProps {
  meta: MapNavigationMeta;
  visible: boolean;
  actionsRef: React.RefObject<MapNavigationActions | null>;
}

export function MapNavigationBar({
  meta,
  visible,
  actionsRef,
}: MapNavigationBarProps) {
  const { breadcrumbs, canGoBack, isTransitioning, chromeMotionMode } = meta;
  const interactive = chromeIsInteractive(visible);

  return (
    <nav
      aria-label="Map location"
      aria-hidden={!interactive}
      className="pointer-events-none absolute inset-x-0 top-4 z-40 flex justify-center overflow-visible px-4"
    >
      <div
        className={chromeSlideMotionClass}
        style={chromeSlideStyle(visible, "y", chromeMotionMode)}
      >
        <div
          className={cn(
            "flex max-w-lg flex-wrap items-center justify-center gap-2 rounded-xl border border-border bg-surface/97 px-3 py-2 shadow-lg backdrop-blur-sm",
            interactive ? "pointer-events-auto" : "pointer-events-none",
          )}
        >
          <button
            type="button"
            aria-label="Back"
            onClick={() => actionsRef.current?.onBack()}
            disabled={!canGoBack || isTransitioning}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-text-primary hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="size-5 shrink-0"
            >
              <path
                d="M19 12H5M12 19L5 12L12 5"
                stroke="currentColor"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <ol className="flex flex-wrap items-center justify-center gap-1 text-sm text-text-secondary">
            {breadcrumbs.map((level, i) => (
              <li key={level.id} className="flex items-center gap-1">
                {i > 0 ? (
                  <span aria-hidden="true" className="text-text-secondary/60">
                    /
                  </span>
                ) : null}
                <button
                  type="button"
                  disabled={
                    i === breadcrumbs.length - 1 || isTransitioning
                  }
                  onClick={() => actionsRef.current?.onNavigateToIndex(i)}
                  className={cn(
                    "rounded-md px-1.5 py-0.5 transition-colors",
                    i === breadcrumbs.length - 1
                      ? "font-semibold text-text-primary"
                      : "hover:bg-surface-subtle hover:text-action-primary",
                    isTransitioning && "cursor-not-allowed opacity-60",
                  )}
                >
                  {level.title}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </nav>
  );
}
