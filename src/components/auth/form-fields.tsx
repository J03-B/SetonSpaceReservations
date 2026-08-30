import type { ReactNode } from "react";

export function AuthMessage({
  error,
  success,
  className = "",
}: {
  error?: string;
  success?: string;
  className?: string;
}) {
  if (error) {
    return (
      <p
        className={`rounded-md border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-sm text-status-danger ${className}`}
        role="alert"
      >
        {error}
      </p>
    );
  }

  if (success) {
    return (
      <p
        className={`rounded-md border border-status-success/30 bg-status-available-bg px-3 py-2 text-sm text-status-success ${className}`}
        role="status"
      >
        {success}
      </p>
    );
  }

  return null;
}

export function Field({
  id,
  label,
  required,
  optional,
  help,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  help?: string;
  error?: string;
  size?: "md" | "lg";
  children: ReactNode;
}) {
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-text-primary">
        {label}
        {required ? (
          <span className="ml-1 font-normal text-text-secondary">Required</span>
        ) : null}
        {optional ? (
          <span className="ml-1 font-normal text-text-secondary">Optional</span>
        ) : null}
      </label>
      {help ? (
        <p id={helpId} className="mt-1 text-sm text-text-secondary">
          {help}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={errorId} className="mt-1 text-sm text-status-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const inputClassName =
  "mt-1 min-h-11 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary";

export const largeInputClassName =
  "mt-2 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-base text-text-primary";

export const primaryButtonClassName =
  "inline-flex min-h-11 w-full items-center justify-center rounded-md bg-action-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-action-primary-hover disabled:opacity-60";

export const largeButtonClassName =
  "inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-action-primary px-4 py-2 text-base font-medium text-text-inverse hover:bg-action-primary-hover disabled:opacity-60";

export const secondaryButtonClassName =
  "inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border-strong bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-subtle disabled:opacity-60";

export const largeSecondaryButtonClassName =
  "inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-border-strong bg-surface px-4 py-2 text-base font-medium text-text-primary hover:bg-surface-subtle disabled:opacity-60";
