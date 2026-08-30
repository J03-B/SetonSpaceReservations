"use client";

import type { ReactNode } from "react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthMessage, Field, inputClassName } from "@/components/auth/form-fields";
import {
  decideReservationRequestAction,
  undoReservationApprovalAction,
} from "@/lib/auth/reservation-actions";

export interface ManagedEvent {
  id: string;
  title: string;
  why: string;
  roomName: string;
  building: string;
  requesterName: string;
  requesterEmail: string;
  when: string;
  hasConflict: boolean;
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <dt className="w-12 shrink-0 pt-1.5 text-left text-xs font-semibold tracking-wide text-text-secondary uppercase">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 rounded-md border border-border bg-surface-subtle px-2.5 py-1.5 text-left text-sm text-text-primary">
        {children}
      </dd>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-5 w-5">
      <path
        d="M5.5 12.5 10 17l8.5-9.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-5 w-5">
      <path
        d="M7 7l10 10M17 7 7 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ConflictIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-5 w-5">
      <path
        d="M12 5.2 3.8 19.5h16.4L12 5.2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M12 10v4.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17.2" r="0.85" fill="currentColor" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-5 w-5">
      <path
        d="M6 4h11l3 3v13H6V4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M9 4v5h7V4M9 20v-6h6v6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReturnIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-5 w-5">
      <path
        d="M9 15 3 9l6-6M3 9h11a5 5 0 0 1 0 10h-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-5 w-5">
      <path
        d="M19 12H7M11 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UndoButton({ reservationId }: { reservationId: string }) {
  const [state, action, pending] = useActionState(
    undoReservationApprovalAction,
    {},
  );

  return (
    <div className="mt-4">
      {state.error ? (
        <div className="mb-3">
          <AuthMessage error={state.error} />
        </div>
      ) : null}
      <div className="flex items-center justify-center">
        <form action={action}>
          <input type="hidden" name="reservation_id" value={reservationId} />
          <button
            type="submit"
            disabled={pending}
            title="Undo approval"
            aria-label="Undo approval and return to requests"
            className="inline-flex size-11 items-center justify-center rounded-full bg-status-warning-bg text-status-warning hover:opacity-90 disabled:opacity-60"
          >
            <UndoIcon />
          </button>
        </form>
      </div>
    </div>
  );
}

function DecisionButtons({
  requestId,
  hasConflict,
  initialDeclining = false,
}: {
  requestId: string;
  hasConflict: boolean;
  initialDeclining?: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    decideReservationRequestAction,
    {},
  );
  const [declining, setDeclining] = useState(initialDeclining);
  const reasonId = `decline-reason-${requestId}`;
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!declining) return;
    reasonRef.current?.focus();
    formRef.current?.scrollIntoView({ block: "center" });
  }, [declining]);

  function cancelDecline() {
    setDeclining(false);
    if (initialDeclining) {
      router.replace("/manage", { scroll: false });
    }
  }

  return (
    <div className="mt-4">
      {state.error ? (
        <div className="mb-3">
          <AuthMessage error={state.error} />
        </div>
      ) : null}
      {declining ? (
        <form ref={formRef} action={action} className="space-y-3">
          <input type="hidden" name="request_id" value={requestId} />
          <input type="hidden" name="decision" value="declined" />
          <Field id={reasonId} label="Reason for decline">
            <textarea
              ref={reasonRef}
              id={reasonId}
              name="decline_reason"
              required
              maxLength={2000}
              rows={4}
              className={inputClassName}
            />
          </Field>
          <div className="flex items-center justify-center gap-2">
            <button
              type="submit"
              disabled={pending}
              title="Save decline"
              aria-label="Save decline"
              className="inline-flex size-11 items-center justify-center rounded-full bg-status-danger text-text-inverse hover:opacity-90 disabled:opacity-60"
            >
              <SaveIcon />
            </button>
            <button
              type="button"
              disabled={pending}
              title="Return"
              aria-label="Return without declining"
              onClick={cancelDecline}
              className="inline-flex size-11 items-center justify-center rounded-full border border-border-strong bg-surface text-text-primary hover:bg-surface-subtle disabled:opacity-60"
            >
              <ReturnIcon />
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-center gap-2">
          {hasConflict ? (
            <span
              title="Conflicts with another reservation"
              className="inline-flex size-11 items-center justify-center rounded-full bg-status-pending-bg text-status-pending"
            >
              <ConflictIcon />
              <span className="sr-only">Conflicts with another reservation</span>
            </span>
          ) : null}
          <form action={action}>
            <input type="hidden" name="request_id" value={requestId} />
            <input type="hidden" name="decision" value="approved" />
            <button
              type="submit"
              disabled={pending}
              title="Approve"
              aria-label="Approve request"
              className="inline-flex size-11 items-center justify-center rounded-full bg-status-available text-text-inverse hover:opacity-90 disabled:opacity-60"
            >
              <CheckIcon />
            </button>
          </form>
          <button
            type="button"
            disabled={pending}
            title="Decline"
            aria-label="Decline request"
            onClick={() => setDeclining(true)}
            className="inline-flex size-11 items-center justify-center rounded-full bg-status-danger text-text-inverse hover:opacity-90 disabled:opacity-60"
          >
            <CloseIcon />
          </button>
        </div>
      )}
    </div>
  );
}

export function RequestCard({
  item,
  showDecisions,
  showUndo,
  initialDeclining,
}: {
  item: ManagedEvent;
  showDecisions?: boolean;
  showUndo?: boolean;
  initialDeclining?: boolean;
}) {
  return (
    <article className="rounded-lg border border-border p-3">
      <dl className="space-y-2">
        <Detail label="Where">
          <span className="block font-medium">{item.roomName}</span>
          <span className="mt-0.5 block text-text-secondary">{item.building}</span>
        </Detail>
        <Detail label="Who">
          <span className="block font-medium">{item.requesterName}</span>
          <span className="mt-0.5 block text-text-secondary">{item.requesterEmail}</span>
        </Detail>
        <Detail label="When">
          <span className="whitespace-pre-line">{item.when}</span>
        </Detail>
        <Detail label="Why">{item.why}</Detail>
      </dl>
      {showDecisions ? (
        <DecisionButtons
          requestId={item.id}
          hasConflict={item.hasConflict}
          initialDeclining={initialDeclining}
        />
      ) : null}
      {showUndo ? <UndoButton reservationId={item.id} /> : null}
    </article>
  );
}

export function EventCards({
  items,
  empty,
  showDecisions,
  showUndo,
  openDeclineRequestId,
}: {
  items: ManagedEvent[];
  empty?: string;
  showDecisions?: boolean;
  showUndo?: boolean;
  openDeclineRequestId?: string;
}) {
  if (items.length === 0) {
    if (!empty) return null;
    return (
      <div className="flex min-h-48 flex-1 items-center justify-center">
        <p className="text-center text-sm text-text-secondary">{empty}</p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-3 gap-2">
      {items.map((item) => (
        <li key={item.id}>
          <RequestCard
            item={item}
            showDecisions={showDecisions}
            showUndo={showUndo}
            initialDeclining={item.id === openDeclineRequestId}
          />
        </li>
      ))}
    </ul>
  );
}
