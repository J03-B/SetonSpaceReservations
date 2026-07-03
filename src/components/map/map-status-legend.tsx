"use client";

import {
  chromeIsInteractive,
  chromeSlideMotionClass,
  chromeSlideStyle,
  type ChromeMotionMode,
} from "@/components/map/map-chrome-motion";
import { FLOOR_STATUS_COLORS } from "@/lib/map/status-colors";
import { cn } from "@/lib/utils";

const LEGEND_ITEMS = [
  {
    key: "Available" as const,
    name: "Available",
    description: "Free for your whole time window",
  },
  {
    key: "Pending" as const,
    name: "Pending",
    description: "Awaiting approval",
  },
  {
    key: "Reserved" as const,
    name: "Taken",
    description: "Already booked",
  },
];

interface MapStatusLegendProps {
  visible: boolean;
  chromeMotionMode?: ChromeMotionMode;
  className?: string;
}

export function MapStatusLegend({
  visible,
  chromeMotionMode = "idle",
  className,
}: MapStatusLegendProps) {
  const interactive = chromeIsInteractive(visible);

  return (
    <div
      aria-label="Room availability key"
      aria-hidden={!interactive}
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-4",
        className,
      )}
    >
      <div
        className={chromeSlideMotionClass}
        style={chromeSlideStyle(visible, "y", chromeMotionMode)}
      >
        <div
          className={cn(
            "flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-xl border border-border bg-surface/97 px-5 py-2.5 shadow-lg backdrop-blur-sm",
            interactive ? "pointer-events-auto" : "pointer-events-none",
          )}
        >
          {LEGEND_ITEMS.map((item) => {
            const colors = FLOOR_STATUS_COLORS[item.key];
            return (
              <div
                key={item.key}
                className="flex items-center gap-2"
                title={item.description}
              >
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full border-2"
                  style={{
                    backgroundColor: colors.fill,
                    borderColor: colors.stroke,
                  }}
                  aria-hidden="true"
                />
                <span className="text-sm font-medium text-text-primary">
                  {item.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
