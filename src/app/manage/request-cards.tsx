"use client";

import { useActionState, useState } from "react";
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
  children: string;
}) {
  return (
    <div className="text-center">
      <dt className="text-xs font-semibold tracking-wide text-text-secondary uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm whitespace-pre-line text-text-primary">
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
}: {
  requestId: string;
  hasConflict: boolean;
}) {
  const [state, action, pending] = useActionState(
    decideReservationRequestAction,
    {},
  );
  const [declining, setDeclining] = useState(false);
  const reasonId = `decline-reason-${requestId}`;

  return (
    <div className="mt-4">
      {state.error ? (
        <div className="mb-3">
          <AuthMessage error={state.error} />
        </div>
      ) : null}
      {declining ? (
        <form action={action} className="space-y-3">
          <input type="hidden" name="request_id" value={requestId} />
          <input type="hidden" name="decision" value="declined" />
          <Field id={reasonId} label="Reason for decline" required>
            <textarea
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
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-status-danger px-4 py-2 text-sm font-medium text-text-inverse hover:opacity-90 disabled:opacity-60"
            >
              Send decline
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setDeclining(false)}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border-strong bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-subtle disabled:opacity-60"
            >
              Cancel
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
}: {
  item: ManagedEvent;
  showDecisions?: boolean;
  showUndo?: boolean;
}) {
  return (
    <article className="rounded-lg border border-border p-3">
      <div className="text-center">
        <h4 className="text-base font-semibold text-text-primary">
          {item.title}
        </h4>
        <p className="mt-1 text-sm font-medium text-text-primary">
          {item.requesterName}
        </p>
        <p className="text-sm text-text-secondary">{item.requesterEmail}</p>
      </div>
      <dl className="mt-3 space-y-2">
        <Detail label="When">{item.when}</Detail>
        <Detail label="Why">{item.why}</Detail>
      </dl>
      {showDecisions ? (
        <DecisionButtons requestId={item.id} hasConflict={item.hasConflict} />
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
}: {
  items: ManagedEvent[];
  empty?: string;
  showDecisions?: boolean;
  showUndo?: boolean;
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
          />
        </li>
      ))}
    </ul>
  );
}
