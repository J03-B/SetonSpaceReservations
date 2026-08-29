"use client";

import { useActionState, useEffect, useState } from "react";
import type { SessionUser } from "@/lib/auth/session";
import { signOutAction, updateProfileAction } from "@/lib/auth/actions";
import { stopTempViewAction } from "@/lib/auth/impersonation-actions";
import { AccessBadge } from "@/components/account/access-badge";
import {
  AuthMessage,
  Field,
  largeButtonClassName,
  largeInputClassName,
  largeSecondaryButtonClassName,
} from "@/components/auth/form-fields";
import { cn } from "@/lib/utils";

export interface ManagedSpace {
  name: string;
  building: string | null;
}

function formatManagedLabel(spaces: ManagedSpace[]): string {
  const labels = spaces.map((space) =>
    space.building ? `${space.name} (${space.building})` : space.name,
  );
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

export function AccountSettingsForm({
  user,
  managedSpaces,
}: {
  user: SessionUser;
  managedSpaces: ManagedSpace[];
}) {
  const [profileState, profileAction, profilePending] = useActionState(
    updateProfileAction,
    null,
  );
  const [fullName, setFullName] = useState(user.fullName);

  useEffect(() => {
    if (profileState?.savedFullName) {
      setFullName(profileState.savedFullName);
    }
  }, [profileState?.savedFullName]);

  const savedName = profileState?.savedFullName ?? user.fullName;
  const isDirty = fullName.trim() !== savedName.trim();
  const showSaved =
    Boolean(profileState?.success) && !isDirty && !profilePending;

  return (
    <div className="space-y-8">
      {user.isImpersonating ? (
        <div className="space-y-6">
          <p className="text-lg text-text-secondary">
            Temporary view is on. The site uses this account’s access until you
            disable it.
          </p>
          <Field id="email" label="Email" size="lg">
            <input
              id="email"
              value={user.email}
              readOnly
              className={`${largeInputClassName} bg-surface-subtle text-text-secondary`}
            />
          </Field>
          <div className="flex items-center gap-3">
            <h2 className="text-base font-medium leading-none text-text-primary">
              Access
            </h2>
            <AccessBadge label={user.accessLabel} />
          </div>
          <form action={stopTempViewAction}>
            <button type="submit" className={largeButtonClassName}>
              Disable temporary view
            </button>
          </form>
        </div>
      ) : (
        <>
      <form
        action={profileAction}
        className="space-y-6"
        onReset={(event) => event.preventDefault()}
      >
        <AuthMessage error={profileState?.error} />
        <Field id="email" label="Email" size="lg">
          <input
            id="email"
            value={user.email}
            readOnly
            className={`${largeInputClassName} bg-surface-subtle text-text-secondary`}
          />
        </Field>
        <Field
          id="full_name"
          label="Full name"
          error={profileState?.fieldErrors?.full_name}
          size="lg"
        >
          <input
            id="full_name"
            name="full_name"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className={largeInputClassName}
          />
        </Field>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-base font-medium leading-none text-text-primary">
              Access
            </h2>
            <AccessBadge label={user.accessLabel} />
          </div>
          {user.accountGroup === "Manager" && managedSpaces.length > 0 ? (
            <p className="mt-2 text-lg text-text-secondary">
              Manages {formatManagedLabel(managedSpaces)}
            </p>
          ) : null}
        </div>
        <div className="pt-8">
          <button
            type="submit"
            className={cn(
              "inline-flex min-h-16 w-full items-center justify-center rounded-lg px-5 py-3 text-lg font-medium text-text-inverse transition-colors duration-500 disabled:opacity-60",
              showSaved
                ? "bg-status-available hover:bg-status-available"
                : "bg-action-primary hover:bg-action-primary-hover",
            )}
            disabled={profilePending}
            aria-live="polite"
          >
            {profilePending
              ? "Saving…"
              : showSaved
                ? "Profile saved"
                : "Save profile"}
          </button>
        </div>
      </form>
      <form action={signOutAction}>
        <button type="submit" className={largeSecondaryButtonClassName}>
          Log out
        </button>
      </form>
        </>
      )}
    </div>
  );
}
