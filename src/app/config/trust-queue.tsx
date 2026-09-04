"use client";

import { useActionState, useMemo, useState } from "react";
import {
  PersonLines,
  QueuePager,
  pageQueue,
} from "@/app/config/queue-pager";
import { AuthMessage } from "@/components/auth/form-fields";
import type { AccessLabel } from "@/lib/auth/session";
import { approveTrustedUserAction } from "@/lib/auth/trust-actions";

export interface TrustCandidate {
  id: string;
  fullName: string;
  email: string;
  accessLabel: AccessLabel;
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

function TrustCard({
  person,
  onDecline,
}: {
  person: TrustCandidate;
  onDecline: (userId: string) => void;
}) {
  const [state, action, pending] = useActionState(
    approveTrustedUserAction,
    {},
  );

  return (
    <li>
      <div className="flex items-center gap-2 rounded-lg border border-border p-3">
        <PersonLines name={person.fullName} email={person.email} />
        <div className="flex shrink-0 items-center gap-1">
          <form action={action}>
            <input type="hidden" name="user_id" value={person.id} />
            <button
              type="submit"
              disabled={pending}
              title="Approve trusted access"
              aria-label={`Approve trusted access for ${person.fullName}`}
              className="inline-flex size-11 items-center justify-center rounded-full bg-status-available text-text-inverse hover:opacity-90 disabled:opacity-60"
            >
              <CheckIcon />
            </button>
          </form>
          <button
            type="button"
            disabled={pending}
            title="Decline trusted access"
            aria-label={`Decline trusted access for ${person.fullName}`}
            onClick={() => onDecline(person.id)}
            className="inline-flex size-11 items-center justify-center rounded-full bg-status-danger text-text-inverse hover:opacity-90 disabled:opacity-60"
          >
            <CloseIcon />
          </button>
        </div>
      </div>
      {state.error ? (
        <div className="mt-2">
          <AuthMessage error={state.error} />
        </div>
      ) : null}
    </li>
  );
}

export function TrustQueue({ candidates }: { candidates: TrustCandidate[] }) {
  const [declinedIds, setDeclinedIds] = useState<string[]>([]);
  const [page, setPage] = useState(0);

  const remaining = useMemo(
    () => candidates.filter((person) => !declinedIds.includes(person.id)),
    [candidates, declinedIds],
  );
  const paged = pageQueue(remaining, page);

  if (remaining.length === 0) {
    return (
      <div className="flex min-h-48 flex-1 items-center justify-center">
        <p className="text-center text-sm text-text-secondary">
          No trusted access requests
        </p>
      </div>
    );
  }

  return (
    <div>
      <ul className="space-y-2">
        {paged.visible.map((person) => (
          <TrustCard
            key={person.id}
            person={person}
            onDecline={(userId) => {
              setDeclinedIds((current) =>
                current.includes(userId) ? current : [...current, userId],
              );
            }}
          />
        ))}
      </ul>
      <QueuePager
        page={paged.page}
        pageCount={paged.pageCount}
        onPrevious={() => setPage(paged.page - 1)}
        onNext={() => setPage(paged.page + 1)}
      />
    </div>
  );
}
