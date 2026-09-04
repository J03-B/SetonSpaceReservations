"use client";

import { type ReactNode } from "react";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApprovedDialog,
  DeclineDialog,
} from "@/app/config/decision-dialog";
import { PersonLines } from "@/app/config/queue-pager";
import { AuthMessage } from "@/components/auth/form-fields";
import {
  consumeManageFlashAction,
  decideReservationRequestAction,
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

function Stacked({
  primary,
  secondary,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="font-medium text-text-primary">{primary}</div>
      {secondary ? (
        <div className="mt-0.5 break-words text-text-secondary">{secondary}</div>
      ) : null}
    </div>
  );
}

function DecisionToolbar({
  requestId,
  hasConflict,
  pendingApprove,
  approveError,
  approveAction,
  onDecline,
}: {
  requestId: string;
  hasConflict: boolean;
  pendingApprove: boolean;
  approveError?: string;
  approveAction: (payload: FormData) => void;
  onDecline: () => void;
}) {
  return (
    <div>
      {approveError ? (
        <div className="mb-2">
          <AuthMessage error={approveError} />
        </div>
      ) : null}
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
        <form action={approveAction}>
          <input type="hidden" name="request_id" value={requestId} />
          <input type="hidden" name="decision" value="approved" />
          <button
            type="submit"
            disabled={pendingApprove}
            title="Approve"
            aria-label="Approve request"
            className="inline-flex size-11 items-center justify-center rounded-full bg-status-available text-text-inverse hover:opacity-90 disabled:opacity-60"
          >
            <CheckIcon />
          </button>
        </form>
        <button
          type="button"
          disabled={pendingApprove}
          title="Decline"
          aria-label="Decline request"
          onClick={onDecline}
          className="inline-flex size-11 items-center justify-center rounded-full bg-status-danger text-text-inverse hover:opacity-90 disabled:opacity-60"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}

function WhoWhyRow({ item }: { item: ManagedEvent }) {
  return (
    <tr className="border-b border-border align-top">
      <td className="px-2 py-3">
        <PersonLines name={item.requesterName} email={item.requesterEmail} />
      </td>
      <td className="px-2 py-3">
        <span className="break-words text-text-primary">{item.why}</span>
      </td>
    </tr>
  );
}

function EventRow({
  item,
  showDecisions,
  onDecline,
}: {
  item: ManagedEvent;
  showDecisions?: boolean;
  onDecline?: () => void;
}) {
  const [approveState, approveAction, pendingApprove] = useActionState(
    decideReservationRequestAction,
    {},
  );

  return (
    <tr className="border-b border-border align-top">
      <td className="px-2 py-3">
        <Stacked primary={item.roomName} secondary={item.building} />
      </td>
      <td className="px-2 py-3">
        <PersonLines name={item.requesterName} email={item.requesterEmail} />
      </td>
      <td className="px-2 py-3">
        <span className="whitespace-pre-line text-text-primary">{item.when}</span>
      </td>
      <td className="px-2 py-3">
        <span className="break-words text-text-primary">{item.why}</span>
      </td>
      <td className="px-2 py-3">
        {showDecisions && onDecline ? (
          <DecisionToolbar
            requestId={item.id}
            hasConflict={item.hasConflict}
            pendingApprove={pendingApprove}
            approveError={approveState.error}
            approveAction={approveAction}
            onDecline={onDecline}
          />
        ) : (
          <span className="text-text-secondary">—</span>
        )}
      </td>
    </tr>
  );
}

const HEADER_CLASS =
  "px-2 py-2 text-center text-xs font-semibold tracking-wide text-text-secondary uppercase";

export function EventCards({
  items,
  empty,
  caption,
  columns = "full",
  showDecisions,
  openDeclineRequestId,
  approvedEvent,
  noticeApproved,
}: {
  items: ManagedEvent[];
  empty?: string;
  caption: string;
  columns?: "full" | "who-why";
  showDecisions?: boolean;
  openDeclineRequestId?: string;
  approvedEvent?: ManagedEvent;
  noticeApproved?: boolean;
}) {
  const router = useRouter();
  const [declineItem, setDeclineItem] = useState<ManagedEvent | null>(() => {
    return items.find((item) => item.id === openDeclineRequestId) ?? null;
  });
  const [showApproved, setShowApproved] = useState(Boolean(noticeApproved));
  const fromEmailDecline = Boolean(openDeclineRequestId);

  function closeDecline() {
    setDeclineItem(null);
    void consumeManageFlashAction();
    if (fromEmailDecline) {
      router.replace("/config", { scroll: false });
    }
  }

  const table =
    items.length === 0 ? (
      empty ? (
        <div className="flex min-h-48 flex-1 items-center justify-center">
          <p className="text-center text-sm text-text-secondary">{empty}</p>
        </div>
      ) : null
    ) : (
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          {columns === "who-why" ? (
            <colgroup>
              <col className="w-[12rem]" />
              <col />
            </colgroup>
          ) : (
            <colgroup>
              <col className="w-[16%]" />
              <col className="w-[13rem]" />
              <col className="w-[20%]" />
              <col />
              <col className="w-40" />
            </colgroup>
          )}
          <thead className="sticky top-0 z-10 bg-surface">
            <tr className="border-b border-border">
              {columns === "who-why" ? (
                <>
                  <th scope="col" className={HEADER_CLASS}>
                    Who
                  </th>
                  <th scope="col" className={HEADER_CLASS}>
                    Why
                  </th>
                </>
              ) : (
                <>
                  <th scope="col" className={HEADER_CLASS}>
                    Where
                  </th>
                  <th scope="col" className={HEADER_CLASS}>
                    Who
                  </th>
                  <th scope="col" className={HEADER_CLASS}>
                    When
                  </th>
                  <th scope="col" className={HEADER_CLASS}>
                    Why
                  </th>
                  <th scope="col" className={HEADER_CLASS}>
                    Actions
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((item) =>
              columns === "who-why" ? (
                <WhoWhyRow key={item.id} item={item} />
              ) : (
                <EventRow
                  key={item.id}
                  item={item}
                  showDecisions={showDecisions}
                  onDecline={() => setDeclineItem(item)}
                />
              ),
            )}
          </tbody>
        </table>
      </div>
    );

  return (
    <>
      {table}
      {declineItem ? (
        <DeclineDialog item={declineItem} onClose={closeDecline} />
      ) : null}
      {showApproved && !declineItem ? (
        <ApprovedDialog
          item={approvedEvent}
          onClose={() => {
            setShowApproved(false);
            void consumeManageFlashAction();
          }}
        />
      ) : null}
    </>
  );
}
