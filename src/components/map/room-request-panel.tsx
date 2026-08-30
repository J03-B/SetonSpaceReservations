"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { MAP_OVERLAY_PAD_CLASS } from "@/components/map/map-chrome-motion";
import { cn } from "@/lib/utils";

export function RoomRequestPanel({
  spaceId,
  spaceName,
  isSignedIn,
  requestPending,
  requestBusy,
  requestError,
  onRequest,
}: {
  spaceId: string;
  spaceName: string;
  isSignedIn: boolean;
  requestPending: boolean;
  requestBusy: boolean;
  requestError: string | null;
  onRequest: (description: string) => void;
}) {
  const [description, setDescription] = useState("");

  useEffect(() => {
    setDescription("");
  }, [spaceId]);

  return (
    <section
      className={cn(
        "flex w-full min-w-0 shrink-0 flex-col rounded-xl border border-border bg-surface/97 shadow-lg backdrop-blur-sm",
        MAP_OVERLAY_PAD_CLASS,
      )}
      aria-labelledby="room-request-heading"
    >
      <h2
        id="room-request-heading"
        className="truncate text-lg font-semibold text-text-primary"
      >
        Requesting Room: {spaceName}
      </h2>

      {requestPending ? (
        <div
          className="mt-4 flex min-h-11 items-center justify-center rounded-md border border-status-pending/30 bg-status-pending-bg px-4 py-2"
          role="status"
        >
          <StatusBadge status="Pending" />
        </div>
      ) : (
        <>
          <label
            htmlFor={`request-reason-${spaceId}`}
            className="mt-4 text-xs font-medium uppercase tracking-wide text-text-secondary"
          >
            Reason
          </label>
          <div className="mt-1.5 rounded-lg border border-border bg-surface-subtle px-3 py-2 focus-within:border-border-strong">
            <textarea
              id={`request-reason-${spaceId}`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              maxLength={2000}
              className="field-box min-h-16 w-full resize-y bg-transparent text-sm font-semibold text-text-primary outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => onRequest(description)}
            disabled={requestBusy || description.trim().length === 0}
            aria-label={
              requestBusy
                ? "Sending request"
                : description.trim().length === 0
                  ? "Please provide a reason for the space."
                  : isSignedIn
                    ? "Request this space"
                    : "Sign in to request this space"
            }
            className={cn(
              "relative mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-action-primary px-4 py-2 text-sm font-medium text-text-inverse transition-opacity duration-300",
              description.trim().length === 0
                ? "cursor-not-allowed opacity-40"
                : "hover:bg-action-primary-hover",
              requestBusy && "pointer-events-none opacity-70",
            )}
          >
            {requestBusy ? (
              "Sending request…"
            ) : (
              <span className="grid place-items-center text-center" aria-hidden>
                <span
                  className={cn(
                    "col-start-1 row-start-1 transition-opacity duration-300",
                    description.trim().length > 0 ? "opacity-0" : "opacity-100",
                  )}
                >
                  Please provide a reason for the space.
                </span>
                <span
                  className={cn(
                    "col-start-1 row-start-1 transition-opacity duration-300",
                    description.trim().length > 0 ? "opacity-100" : "opacity-0",
                  )}
                >
                  {isSignedIn ? "Request this space" : "Sign in to request"}
                </span>
              </span>
            )}
          </button>
        </>
      )}
      {requestError ? (
        <p className="mt-2 text-center text-sm text-status-danger" role="alert">
          {requestError}
        </p>
      ) : null}
    </section>
  );
}
