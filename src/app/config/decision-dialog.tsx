"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AuthMessage } from "@/components/auth/form-fields";
import { decideReservationRequestAction } from "@/lib/auth/reservation-actions";
import type { ManagedEvent } from "@/app/config/request-cards";

const CONFETTI_COLORS = ["#1a7f4b", "#3da56a", "#8fd4a8", "#e8f5ee"];

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function GreenConfetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersReducedMotion()) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const pieces = Array.from({ length: 90 }, () => ({
      x: width * 0.5 + (Math.random() - 0.5) * 280,
      y: height * 0.22 + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 12,
      vy: -8 - Math.random() * 8,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.35,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      gravity: 0.28 + Math.random() * 0.1,
    }));

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      let visible = false;
      for (const piece of pieces) {
        piece.vy += piece.gravity;
        piece.x += piece.vx;
        piece.y += piece.vy;
        piece.rot += piece.vr;
        const onScreen =
          piece.y < height + 24 &&
          piece.y > -24 &&
          piece.x > -24 &&
          piece.x < width + 24;
        if (!onScreen) continue;
        visible = true;
        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.rot);
        ctx.fillStyle = piece.color;
        ctx.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
        ctx.restore();
      }
      if (visible) {
        raf = window.requestAnimationFrame(draw);
      }
    };
    raf = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0"
      aria-hidden
    />
  );
}

function DetailCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-center text-base text-text-secondary">{label}</p>
      <div className="mt-0 rounded-[10px] border border-border bg-surface-subtle px-3 py-2 text-center text-base leading-snug text-text-primary">
        {children}
      </div>
    </div>
  );
}

export function EmailStyleRequestDetails({ item }: { item: ManagedEvent }) {
  const requester = [item.requesterName, item.requesterEmail]
    .filter(Boolean)
    .join("\n");

  return (
    <div>
      <DetailCard label="Space">{item.roomName}</DetailCard>
      <div className="mt-2">
        <DetailCard label="When">
          <span className="whitespace-pre-line">{item.when}</span>
        </DetailCard>
      </div>
      <div className="mt-2">
        <DetailCard label="Reason">
          <span className="whitespace-pre-line">{item.why}</span>
        </DetailCard>
      </div>
      <div className="mt-2">
        <DetailCard label="Requester">
          <span className="whitespace-pre-line">{requester || "—"}</span>
        </DetailCard>
      </div>
      <div className="mt-3 border-t border-border pt-3">
        <div className="flex items-center gap-2.5">
          <span className="shrink-0 text-base text-text-secondary">
            Request ID
          </span>
          <div className="min-w-0 flex-1 rounded-[10px] border border-border bg-surface-subtle px-2.5 py-1.5 text-center text-[11px] leading-snug text-text-primary select-all">
            {item.id}
          </div>
        </div>
      </div>
    </div>
  );
}

function DialogShell({
  titleId,
  title,
  tone,
  confetti,
  onClose,
  closeDisabled,
  children,
}: {
  titleId: string;
  title: string;
  tone: "approved" | "declined";
  confetti?: boolean;
  onClose: () => void;
  closeDisabled?: boolean;
  children: React.ReactNode;
}) {
  const titleClass =
    tone === "approved"
      ? "flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-[10px] border border-status-available bg-status-available-bg px-3 text-center text-base font-semibold text-status-available"
      : "flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-[10px] border border-status-danger bg-[#fdecea] px-3 text-center text-base font-semibold text-status-danger";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        disabled={closeDisabled}
        onClick={() => {
          if (!closeDisabled) onClose();
        }}
      />
      {confetti ? (
        <div className="pointer-events-none absolute inset-0 z-[1]">
          <GreenConfetti />
        </div>
      ) : null}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[2] w-full max-w-lg rounded-lg border border-border bg-surface p-5 shadow-xl"
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex size-11 shrink-0" aria-hidden />
          <h2 id={titleId} className={titleClass}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            aria-label="Close"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-surface-subtle hover:text-text-primary disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-5 w-5">
              <path
                d="M7 7l10 10M17 7 7 17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function ApprovedDialog({
  item,
  onClose,
}: {
  item?: ManagedEvent;
  onClose: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
      router.replace("/config", { scroll: false });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, router]);

  function finish() {
    onClose();
    router.replace("/config", { scroll: false });
  }

  if (!mounted) return null;

  return createPortal(
    <DialogShell
      titleId={titleId}
      title="Request Approved!"
      tone="approved"
      confetti
      onClose={finish}
    >
      {item ? <EmailStyleRequestDetails item={item} /> : null}
    </DialogShell>,
    document.body,
  );
}

export function DeclineDialog({
  item,
  onClose,
}: {
  item: ManagedEvent;
  onClose: () => void;
}) {
  const titleId = useId();
  const reasonId = useId();
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const [mounted, setMounted] = useState(false);
  const [reasonValue, setReasonValue] = useState("");
  const [state, action, pending] = useActionState(
    decideReservationRequestAction,
    {},
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || pending) return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const focusId = window.requestAnimationFrame(() => {
      reasonRef.current?.focus();
    });
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
      window.cancelAnimationFrame(focusId);
    };
  }, [onClose, pending]);

  if (!mounted) return null;

  return createPortal(
    <DialogShell
      titleId={titleId}
      title="Decline request"
      tone="declined"
      onClose={onClose}
      closeDisabled={pending}
    >
      <form action={action} className="space-y-3">
        <input type="hidden" name="request_id" value={item.id} />
        <input type="hidden" name="decision" value="declined" />
        <div>
          <label
            htmlFor={reasonId}
            className="block text-center text-base text-text-secondary"
          >
            Reason
            {reasonValue.trim().length === 0 ? (
              <span className="ml-1 text-sm">Required</span>
            ) : null}
          </label>
          <textarea
            ref={reasonRef}
            id={reasonId}
            name="decline_reason"
            required
            maxLength={2000}
            rows={2}
            value={reasonValue}
            onChange={(event) => setReasonValue(event.target.value)}
            className="field-box w-full rounded-[10px] border border-border bg-surface-subtle px-3 py-2 text-center text-base leading-snug text-text-primary outline-none focus:border-border focus:outline-none focus-visible:outline-none"
          />
        </div>
        {state.error ? <AuthMessage error={state.error} /> : null}
        <button
          type="submit"
          disabled={pending}
          className="flex min-h-11 w-full items-center justify-center rounded-md bg-status-danger px-4 text-sm font-medium text-text-inverse hover:opacity-90 disabled:opacity-60"
        >
          Finalize Rejection
        </button>
      </form>
      <div className="mt-4">
        <EmailStyleRequestDetails item={item} />
      </div>
    </DialogShell>,
    document.body,
  );
}
