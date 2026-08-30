"use client";

import { useActionState, useMemo, useState } from "react";
import { ManagedRoomsList } from "@/components/account/managed-rooms-list";
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

const VISIBLE_CARDS = 2;

export function TempViewForm({ people }: { people: TempViewPerson[] }) {
  const [query, setQuery] = useState("");
  const [state, action, pending] = useActionState(startTempViewAction, {});

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = needle
      ? people.filter(
          (person) =>
            person.fullName.toLowerCase().includes(needle) ||
            person.email.toLowerCase().includes(needle),
        )
      : people;
    return matches.slice(0, VISIBLE_CARDS);
  }, [people, query]);

  return (
    <div className="overflow-hidden">
      <label className="block">
        <span className="sr-only">Search accounts</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
          className="min-h-11 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
        />
      </label>
      {state.error ? <div className="mt-3"><AuthMessage error={state.error} /></div> : null}
      <ul className="mt-3 space-y-3">
        {visible.map((person) => (
          <li key={person.email}>
            <form action={action}>
              {person.id ? (
                <input type="hidden" name="user_id" value={person.id} />
              ) : null}
              <input type="hidden" name="email" value={person.email} />
              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-lg border border-border p-4 text-left hover:bg-surface-subtle disabled:opacity-60"
              >
                <p className="truncate font-medium text-text-primary">
                  {person.fullName}
                </p>
                <p className="mt-1 truncate text-sm text-text-secondary">
                  {person.email}
                </p>
                <ManagedRoomsList groups={person.roomGroups} className="mt-3" />
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
