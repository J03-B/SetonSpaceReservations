"use client";

import {
  addDays,
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  isValid,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

function parseDateInput(value: string): Date | null {
  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return isValid(parsed) ? startOfDay(parsed) : null;
}

function formatTimeSlot(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const date = new Date(2000, 0, 1, h, m);
  return format(date, "h:mm a");
}

function minutesTo12h(minutes: number): {
  hour12: number;
  minute: 0 | 30;
  period: "AM" | "PM";
} {
  const clamped = Math.min(23 * 60 + 30, Math.max(0, minutes));
  const h24 = Math.floor(clamped / 60);
  const m = clamped % 60 >= 15 ? 30 : 0;
  const period: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  let hour12 = h24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute: m as 0 | 30, period };
}

function from12h(hour12: number, minute: 0 | 30, period: "AM" | "PM"): number {
  let h24 = hour12 % 12;
  if (period === "PM") h24 += 12;
  if (period === "AM" && hour12 === 12) h24 = 0;
  return Math.min(23 * 60 + 30, Math.max(0, h24 * 60 + minute));
}

const HOUR_ITEMS = Array.from({ length: 12 }, (_, i) => {
  const value = i + 1;
  return { value, label: String(value) };
});

const MINUTE_ITEMS = [
  { value: 0, label: "00" },
  { value: 30, label: "30" },
] as const;

const PERIOD_ITEMS = [
  { value: "AM" as const, label: "AM" },
  { value: "PM" as const, label: "PM" },
];

const WHEEL_ITEM_H = 36;
const WHEEL_VISIBLE_H = 140;
const WHEEL_SIDE_ITEMS = 3;
const WHEEL_DRAG_STEP_PX = WHEEL_ITEM_H;
const WHEEL_GESTURE_RESET_MS = 140;

type WheelItem<T> = {
  value: T;
  label: string;
  disabled?: boolean;
};

function wrapIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

function nearestLoopPosition(position: number, index: number, length: number): number {
  if (length <= 0) return 0;
  const cycle = Math.round((position - index) / length);
  const candidates = [cycle - 1, cycle, cycle + 1].map(
    (candidateCycle) => index + candidateCycle * length,
  );
  return candidates.reduce((best, candidate) =>
    Math.abs(candidate - position) < Math.abs(best - position) ? candidate : best,
  candidates[0]);
}

interface PlannerPopoverProps {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

function PlannerPopover({
  open,
  anchorRef,
  onClose,
  children,
  className,
}: PlannerPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [visible, setVisible] = useState(false);

  useLayoutEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(frameId);
  }, []);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;

    const anchorRect = anchor.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const gap = 6;
    const margin = 8;

    let top = anchorRect.bottom + gap;
    let left = anchorRect.left;

    if (left + panelRect.width > window.innerWidth - margin) {
      left = window.innerWidth - panelRect.width - margin;
    }
    if (left < margin) left = margin;

    if (top + panelRect.height > window.innerHeight - margin) {
      top = anchorRect.top - panelRect.height - gap;
    }
    if (top < margin) top = margin;

    setPosition({ top, left });
  }, [anchorRef]);

  useLayoutEffect(() => {
    const frameId = requestAnimationFrame(() => {
      if (!open) {
        setVisible(false);
        return;
      }
      updatePosition();
      setVisible(true);
    });
    return () => cancelAnimationFrame(frameId);
  }, [open, updatePosition, children]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const panel = panelRef.current;
      const anchor = anchorRef.current;
      if (
        panel?.contains(e.target as Node) ||
        anchor?.contains(e.target as Node)
      ) {
        return;
      }
      onClose();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const onReposition = () => updatePosition();

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, onClose, anchorRef, updatePosition]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      ref={panelRef}
      className={cn(
        "fixed z-[9999] rounded-lg border border-border bg-surface p-3 shadow-2xl transition-opacity duration-100",
        !visible && "pointer-events-none opacity-0",
        className,
      )}
      style={{ top: position.top, left: position.left }}
      role="dialog"
    >
      {children}
    </div>,
    document.body,
  );
}

function TimeWheel<T extends string | number>({
  label,
  ariaLabel = label,
  items,
  value,
  onChange,
  loop = true,
}: {
  label: string;
  ariaLabel?: string;
  items: WheelItem<T>[];
  value: T;
  onChange: (value: T) => void;
  loop?: boolean;
}) {
  const selectableItems = useMemo(
    () => items.filter((item) => !item.disabled),
    [items],
  );
  const selectedIndex = Math.max(
    0,
    selectableItems.findIndex((item) => item.value === value),
  );
  const [visualPosition, setVisualPosition] = useState(selectedIndex);
  const wheelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startY: number;
    startPosition: number;
  } | null>(null);
  const valueRef = useRef(value);
  const selectedPositionRef = useRef(selectedIndex);
  const visualPositionRef = useRef(selectedIndex);
  const wheelReadyRef = useRef(true);
  const wheelResetTimerRef = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);

  useLayoutEffect(() => {
    valueRef.current = value;
    if (dragRef.current || selectableItems.length === 0) return;

    const nextPosition = loop
      ? nearestLoopPosition(
          visualPositionRef.current,
          selectedIndex,
          selectableItems.length,
        )
      : selectedIndex;
    selectedPositionRef.current = nextPosition;
    visualPositionRef.current = nextPosition;

    const frameId = requestAnimationFrame(() => {
      setVisualPosition(nextPosition);
    });
    return () => cancelAnimationFrame(frameId);
  }, [loop, selectableItems.length, selectedIndex, value]);

  const resolvePosition = useCallback(
    (position: number) => {
      if (selectableItems.length === 0) return;
      return loop
        ? Math.round(position)
        : Math.max(
            0,
            Math.min(selectableItems.length - 1, Math.round(position)),
          );
    },
    [loop, selectableItems.length],
  );

  const clampVisualPosition = useCallback(
    (position: number) => {
      if (selectableItems.length === 0 || loop) return position;
      return Math.max(0, Math.min(selectableItems.length - 1, position));
    },
    [loop, selectableItems.length],
  );

  const commitPosition = useCallback(
    (position: number, syncVisual: boolean) => {
      const nextPosition = resolvePosition(position);
      if (nextPosition == null || selectableItems.length === 0) return;
      const nextIndex = loop
        ? wrapIndex(nextPosition, selectableItems.length)
        : nextPosition;
      const next = selectableItems[nextIndex]?.value;
      selectedPositionRef.current = nextPosition;
      if (next != null && next !== valueRef.current) {
        valueRef.current = next;
        onChange(next);
      }
      if (syncVisual) {
        visualPositionRef.current = nextPosition;
        setVisualPosition(nextPosition);
      }
    },
    [loop, onChange, resolvePosition, selectableItems],
  );

  const stepBy = useCallback(
    (delta: number) => {
      commitPosition(selectedPositionRef.current + delta, true);
    },
    [commitPosition],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = wheelRef.current;
    if (!el) return;
    e.preventDefault();
    dragRef.current = {
      startY: e.clientY,
      startPosition: visualPositionRef.current,
    };
    setDragging(true);
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    e.preventDefault();
    const dragDistance = drag.startY - e.clientY;
    const nextPosition = clampVisualPosition(
      drag.startPosition + dragDistance / WHEEL_DRAG_STEP_PX,
    );
    visualPositionRef.current = nextPosition;
    setVisualPosition(nextPosition);
    commitPosition(nextPosition, false);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const snapPosition = resolvePosition(visualPositionRef.current);
    dragRef.current = null;
    setDragging(false);
    if (snapPosition != null) {
      commitPosition(snapPosition, true);
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY === 0) return;
    e.preventDefault();
    if (wheelReadyRef.current) {
      wheelReadyRef.current = false;
      stepBy(e.deltaY > 0 ? 1 : -1);
    }
    if (wheelResetTimerRef.current != null) {
      window.clearTimeout(wheelResetTimerRef.current);
    }
    wheelResetTimerRef.current = window.setTimeout(() => {
      wheelReadyRef.current = true;
      wheelResetTimerRef.current = null;
    }, WHEEL_GESTURE_RESET_MS);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      stepBy(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      stepBy(-1);
    }
  };

  useEffect(() => {
    return () => {
      if (wheelResetTimerRef.current != null) {
        window.clearTimeout(wheelResetTimerRef.current);
      }
    };
  }, []);

  const nearestPosition =
    selectableItems.length === 0
      ? 0
      : loop
        ? Math.round(visualPosition)
        : Math.max(
            0,
            Math.min(selectableItems.length - 1, Math.round(visualPosition)),
          );
  const currentIndex =
    selectableItems.length === 0
      ? 0
      : loop
        ? wrapIndex(nearestPosition, selectableItems.length)
        : nearestPosition;
  const currentLabel = selectableItems[currentIndex]?.label ?? String(value);

  const visibleItems = loop
    ? Array.from({ length: WHEEL_SIDE_ITEMS * 2 + 1 }, (_, i) => {
        const center = Math.round(visualPosition);
        const offset = i - WHEEL_SIDE_ITEMS;
        const position = center + offset;
        const item =
          selectableItems[
            wrapIndex(position, selectableItems.length)
          ];
        return { item, position };
      })
    : selectableItems.map((item, index) => ({
        item,
        position: index,
      }));

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      <span className="mb-1 flex h-[14px] items-center text-[10px] font-medium uppercase tracking-wide text-text-secondary">
        {label || "\u00A0"}
      </span>
      <div
        className="relative w-full planner-time-wheel-mask"
        style={{ height: WHEEL_VISIBLE_H }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-9 -translate-y-1/2 rounded-md border-y border-action-primary/35 bg-action-primary/10"
          aria-hidden="true"
        />
        <div
          ref={wheelRef}
          role="spinbutton"
          tabIndex={0}
          aria-label={ariaLabel}
          aria-valuetext={currentLabel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          onKeyDown={onKeyDown}
          className="planner-time-wheel-scroll relative h-full cursor-grab touch-none overflow-hidden outline-none active:cursor-grabbing"
        >
          {visibleItems.map(({ item, position }) => {
            if (!item) return null;
            const selected = position === nearestPosition;
            const distance = Math.abs(position - visualPosition);
            return (
              <div
                key={`${String(item.value)}-${position}`}
                className={cn(
                  "pointer-events-none absolute left-0 right-0 top-1/2 flex h-9 items-center justify-center text-base font-semibold leading-none will-change-transform",
                  dragging
                    ? "transition-[color,opacity] duration-75"
                    : "transition-[color,opacity,transform] duration-150 ease-out",
                  selected && "text-action-primary",
                  !selected && "text-text-secondary",
                  distance >= 3 && "opacity-35",
                  distance === 2 && "opacity-60",
                  distance === 1 && "opacity-80",
                )}
                style={{
                  transform: `translateY(calc(-50% + ${(position - visualPosition) * WHEEL_ITEM_H}px))`,
                  lineHeight: `${WHEEL_ITEM_H}px`,
                }}
              >
                {item.label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface PlannerDatePickerProps {
  value: Date;
  onChange: (day: Date) => void;
  displayClassName?: string;
}

export function PlannerDatePicker({
  value,
  onChange,
  displayClassName,
}: PlannerDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(value));
  const anchorRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const frameId = requestAnimationFrame(() => {
      setViewMonth(startOfMonth(value));
    });
    return () => cancelAnimationFrame(frameId);
  }, [open, value]);

  const monthStart = startOfMonth(viewMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const monthDays = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full min-w-0 text-left text-sm font-semibold text-text-primary hover:text-action-primary",
          displayClassName,
        )}
      >
        {format(value, "EEE, MMM d, yyyy")}
      </button>

      <PlannerPopover
        open={open}
        anchorRef={anchorRef}
        onClose={() => setOpen(false)}
        className="w-[17rem]"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setViewMonth((m) => addMonths(m, -1))}
            className="inline-flex size-8 items-center justify-center rounded-md border border-border text-text-primary hover:bg-surface-subtle"
          >
            ‹
          </button>
          <span className="text-sm font-semibold text-text-primary">
            {format(viewMonth, "MMMM yyyy")}
          </span>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
            className="inline-flex size-8 items-center justify-center rounded-md border border-border text-text-primary hover:bg-surface-subtle"
          >
            ›
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((label) => (
            <span
              key={label}
              className="text-center text-[10px] font-medium uppercase tracking-wide text-text-secondary"
            >
              {label}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {monthDays.map((day) => {
            const inMonth = isSameMonth(day, viewMonth);
            const selected = isSameDay(day, value);

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => {
                  onChange(startOfDay(day));
                  setOpen(false);
                }}
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors",
                  !inMonth && "text-text-secondary/50",
                  inMonth && !selected && "text-text-primary hover:bg-surface-subtle",
                  selected &&
                    "bg-action-primary text-text-inverse hover:bg-action-primary-hover",
                )}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      </PlannerPopover>
    </>
  );
}

interface PlannerTimePickerProps {
  minutes: number;
  onChange: (minutes: number) => void;
  displayClassName?: string;
}

export function PlannerTimePicker({
  minutes,
  onChange,
  displayClassName,
}: PlannerTimePickerProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const parts = minutesTo12h(minutes);

  const applyParts = (hour12: number, minute: 0 | 30, period: "AM" | "PM") => {
    onChange(from12h(hour12, minute, period));
  };

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full min-w-0 text-left text-sm font-semibold text-text-primary hover:text-action-primary",
          displayClassName,
        )}
      >
        {formatTimeSlot(from12h(parts.hour12, parts.minute, parts.period))}
      </button>

      <PlannerPopover
        open={open}
        anchorRef={anchorRef}
        onClose={() => setOpen(false)}
        className="w-[15.5rem]"
      >
        <div className="flex items-end gap-1">
          <TimeWheel
            label="Hour"
            items={HOUR_ITEMS}
            value={parts.hour12}
            onChange={(hour12) =>
              applyParts(hour12, parts.minute, parts.period)
            }
          />
          <TimeWheel
            label="Min"
            items={[...MINUTE_ITEMS]}
            value={parts.minute}
            loop={false}
            onChange={(minute) =>
              applyParts(parts.hour12, minute, parts.period)
            }
          />
          <TimeWheel
            label=""
            ariaLabel="AM or PM"
            items={[...PERIOD_ITEMS]}
            value={parts.period}
            loop={false}
            onChange={(period) =>
              applyParts(parts.hour12, parts.minute, period)
            }
          />
        </div>
      </PlannerPopover>
    </>
  );
}

export { parseDateInput, formatTimeSlot };
