"use client";

import { useActionState, useEffect, useState } from "react";
import { profileNameInput } from "@/lib/auth/profile-name";
import type { SessionUser } from "@/lib/auth/session";
import type { BuildingRoomGroup } from "@/lib/auth/managed-rooms";
import { signOutAction, updateProfileAction } from "@/lib/auth/actions";
import { stopTempViewAction } from "@/lib/auth/impersonation-actions";
import { AccessBadge } from "@/components/account/access-badge";
import { ManagedRoomsList } from "@/components/account/managed-rooms-list";
import {
  AuthMessage,
  Field,
  largeButtonClassName,
  largeInputClassName,
  largeSecondaryButtonClassName,
} from "@/components/auth/form-fields";
import { cn } from "@/lib/utils";

export function AccountSettingsForm({
  user,
  roomGroups,
}: {
  user: SessionUser;
  roomGroups: BuildingRoomGroup[];
}) {
  const [profileState, profileAction, profilePending] = useActionState(
    updateProfileAction,
    null,
  );
  const [fullName, setFullName] = useState(
    profileNameInput(user.fullName, user.email),
  );

  useEffect(() => {
    if (profileState?.savedFullName) {
      setFullName(profileState.savedFullName);
    }
  }, [profileState?.savedFullName]);

  const savedName =
    profileState?.savedFullName ??
    profileNameInput(user.fullName, user.email);
  const isDirty = fullName.trim() !== savedName.trim();
  const showSaved =
    Boolean(profileState?.success) && !isDirty && !profilePending;

  return (
    <div className="space-y-6">
      {user.isImpersonating ? (
        <div className="space-y-5">
          <p className="text-sm text-text-secondary">
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
          <AccessSection label={user.accessLabel} roomGroups={roomGroups} />
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
        className="space-y-5"
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
          label="Name"
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
        <AccessSection label={user.accessLabel} roomGroups={roomGroups} />
        <div className="pt-4">
          <button
            type="submit"
            className={cn(
              largeButtonClassName,
              "transition-colors duration-500",
              showSaved
                ? "bg-status-available hover:bg-status-available"
                : null,
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

function AccessSection({
  label,
  roomGroups,
}: {
  label: SessionUser["accessLabel"];
  roomGroups: BuildingRoomGroup[];
}) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-medium leading-none text-text-primary">
          Access
        </h2>
        <AccessBadge label={label} />
      </div>
      <ManagedRoomsList groups={roomGroups} className="mt-3" />
    </div>
  );
}
