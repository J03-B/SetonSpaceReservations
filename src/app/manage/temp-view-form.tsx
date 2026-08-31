"use client";

import { useActionState, useMemo, useState } from "react";
import {
  PersonLines,
  QueuePager,
  pageQueue,
} from "@/app/manage/queue-pager";
import { AuthMessage } from "@/components/auth/form-fields";
import { startTempViewAction } from "@/lib/auth/impersonation-actions";
import type { BuildingRoomGroup } from "@/lib/auth/managed-rooms";
import type { AccessLabel } from "@/lib/auth/session";

export interface TempViewPerson {
  id: string;
  fullName: string;
  email: string;
  accessLabel: AccessLabel;
  roomGroups: BuildingRoomGroup[];
}

export function TempViewForm({ people }: { people: TempViewPerson[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [state, action, pending] = useActionState(startTempViewAction, {});

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return people;
    return people.filter(
      (person) =>
        person.fullName.toLowerCase().includes(needle) ||
        person.email.toLowerCase().includes(needle),
    );
  }, [people, query]);

  const paged = pageQueue(matches, page);

  return (
    <div className="overflow-hidden">
      <label className="block">
        <span className="sr-only">Search accounts</span>
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(0);
          }}
          placeholder="Search"
          className="min-h-11 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
        />
      </label>
      {state.error ? (
        <div className="mt-3">
          <AuthMessage error={state.error} />
        </div>
      ) : null}
      {matches.length === 0 ? (
        <p className="mt-6 text-center text-sm text-text-secondary">
          {people.length === 0 ? "No accounts" : "No matching accounts"}
        </p>
      ) : (
        <>
          <ul className="mt-3 space-y-2">
            {paged.visible.map((person) => (
              <li key={person.email}>
                <form action={action}>
                  {person.id ? (
                    <input type="hidden" name="user_id" value={person.id} />
                  ) : null}
                  <input type="hidden" name="email" value={person.email} />
                  <button
                    type="submit"
                    disabled={pending}
                    className="flex min-h-11 w-full items-center rounded-lg border border-border px-3 py-3 text-left hover:bg-surface-subtle disabled:opacity-60"
                  >
                    <PersonLines name={person.fullName} email={person.email} />
                  </button>
                </form>
              </li>
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
