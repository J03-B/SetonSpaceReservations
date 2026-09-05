"use client";

import { useActionState, useMemo, useState } from "react";
import {
  PersonLines,
  QueuePager,
  pageQueue,
} from "@/app/config/queue-pager";
import { AuthMessage } from "@/components/auth/form-fields";
import type { AccessLabel } from "@/lib/auth/session";
import {
  promoteUserToTrustedAction,
  setUserAccountStatusAction,
  type UsersAdminActionState,
} from "@/lib/auth/users-admin-actions";

export type AdminAccountRow = {
  id: string;
  fullName: string;
  email: string;
  accessLabel: AccessLabel;
  accountStatus: "active" | "suspended" | "revoked";
  canPromote: boolean;
};

function StatusChip({ status }: { status: AdminAccountRow["accountStatus"] }) {
  const label =
    status === "active"
      ? "Active"
      : status === "suspended"
        ? "Suspended"
        : "Revoked";
  const tone =
    status === "active"
      ? "bg-status-available-bg text-status-available"
      : status === "suspended"
        ? "bg-status-pending-bg text-status-pending"
        : "bg-status-blocked-bg text-status-blocked";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}
    >
      {label}
    </span>
  );
}

function AccountRow({ person }: { person: AdminAccountRow }) {
  const [promoteState, promoteAction, promotePending] = useActionState(
    promoteUserToTrustedAction,
    {} as UsersAdminActionState,
  );
  const [statusState, statusAction, statusPending] = useActionState(
    setUserAccountStatusAction,
    {} as UsersAdminActionState,
  );
  const pending = promotePending || statusPending;
  const message = promoteState.error || statusState.error
    ? { error: promoteState.error || statusState.error }
    : promoteState.success || statusState.success
      ? { success: promoteState.success || statusState.success }
      : null;

  return (
    <li>
      <div className="rounded-lg border border-border p-3">
        <div className="flex items-start gap-2">
          <PersonLines name={person.fullName} email={person.email} />
          <div className="flex shrink-0 flex-col items-end gap-1">
            <StatusChip status={person.accountStatus} />
            <span className="text-xs text-text-secondary">{person.accessLabel}</span>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {person.canPromote ? (
            <form action={promoteAction}>
              <input type="hidden" name="user_id" value={person.id} />
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-action-primary px-2.5 py-1 text-xs font-medium text-text-inverse hover:opacity-90 disabled:opacity-60"
              >
                Promote to trusted
              </button>
            </form>
          ) : null}
          {person.accountStatus === "active" ? (
            <>
              <form action={statusAction}>
                <input type="hidden" name="user_id" value={person.id} />
                <input type="hidden" name="status" value="suspended" />
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-md bg-status-pending px-2.5 py-1 text-xs font-medium text-text-inverse hover:opacity-90 disabled:opacity-60"
                >
                  Suspend
                </button>
              </form>
              <form action={statusAction}>
                <input type="hidden" name="user_id" value={person.id} />
                <input type="hidden" name="status" value="revoked" />
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-md bg-status-danger px-2.5 py-1 text-xs font-medium text-text-inverse hover:opacity-90 disabled:opacity-60"
                >
                  Revoke
                </button>
              </form>
            </>
          ) : (
            <form action={statusAction}>
              <input type="hidden" name="user_id" value={person.id} />
              <input type="hidden" name="status" value="active" />
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-status-available px-2.5 py-1 text-xs font-medium text-text-inverse hover:opacity-90 disabled:opacity-60"
              >
                Reactivate
              </button>
            </form>
          )}
        </div>
        {message?.error ? (
          <div className="mt-2">
            <AuthMessage error={message.error} />
          </div>
        ) : null}
        {message?.success ? (
          <p className="mt-2 text-xs text-status-available">{message.success}</p>
        ) : null}
      </div>
    </li>
  );
}

export function UsersAdminPanel({ accounts }: { accounts: AdminAccountRow[] }) {
  const [filter, setFilter] = useState<"all" | "active" | "restricted">("all");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (filter === "active") {
      return accounts.filter((row) => row.accountStatus === "active");
    }
    if (filter === "restricted") {
      return accounts.filter((row) => row.accountStatus !== "active");
    }
    return accounts;
  }, [accounts, filter]);

  const paged = pageQueue(filtered, page);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(
          [
            ["all", "All"],
            ["active", "Active"],
            ["restricted", "Banned"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setFilter(value);
              setPage(0);
            }}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              filter === value
                ? "bg-action-primary text-text-inverse"
                : "bg-action-secondary text-text-secondary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="flex min-h-48 flex-1 items-center justify-center">
          <p className="text-center text-sm text-text-secondary">No accounts</p>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {paged.visible.map((person) => (
              <AccountRow key={person.id} person={person} />
            ))}
          </ul>
          <QueuePager
            page={paged.page}
            pageCount={paged.pageCount}
            onPrevious={() => setPage(paged.page - 1)}
            onNext={() => setPage(paged.page + 1)}
          />
        </>
      )}
    </div>
  );
}
