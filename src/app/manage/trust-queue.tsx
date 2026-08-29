"use client";

import { useActionState } from "react";
import { AuthMessage } from "@/components/auth/form-fields";
import type { AccessLabel } from "@/lib/auth/session";
import { approveTrustedUserAction } from "@/lib/auth/trust-actions";

export interface TrustCandidate {
  id: string;
  fullName: string;
  email: string;
  accessLabel: AccessLabel;
}

function ApproveButton({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(
    approveTrustedUserAction,
    {},
  );

  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="user_id" value={userId} />
      {state.error ? <AuthMessage error={state.error} /> : null}
      {state.success ? <AuthMessage success={state.success} /> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-action-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-action-primary-hover disabled:opacity-60"
      >
        {pending ? "Approving…" : "Approve"}
      </button>
    </form>
  );
}

export function TrustQueue({ candidates }: { candidates: TrustCandidate[] }) {
  if (candidates.length === 0) {
    return (
      <div className="flex min-h-48 flex-1 items-center justify-center">
        <p className="text-center text-sm text-text-secondary">
          No trusted access requests
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {candidates.map((person) => (
        <li key={person.id} className="rounded-lg border border-border p-4">
          <p className="truncate font-medium text-text-primary">
            {person.fullName}
          </p>
          <p className="mt-1 truncate text-sm text-text-secondary">
            {person.email}
          </p>
          <ApproveButton userId={person.id} />
        </li>
      ))}
    </ul>
  );
}
