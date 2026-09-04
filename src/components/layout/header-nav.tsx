"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-6 w-6">
      <path
        d="M7.5 8.25c0-2.4 1.95-4.35 4.5-4.35S16.5 5.85 16.5 8.25c0 1.85-1 3.05-2.85 4.25-1.15.75-1.65 1.4-1.65 2.65"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="19.15" r="1.7" fill="currentColor" />
    </svg>
  );
}

function ManageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-6 w-6">
      <path
        d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-6 w-6">
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M6 18.5c.9-2.6 3.1-4 6-4s5.1 1.4 6 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

const iconLinkClassName =
  "inline-flex size-11 items-center justify-center rounded-md text-text-secondary no-underline hover:bg-surface-subtle hover:text-text-primary";

export function HeaderNav({
  isSignedIn,
  isManager,
}: {
  isSignedIn: boolean;
  isManager: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Account navigation">
      <ul className="flex items-center gap-1">
        <li>
          <Link
            href="/help"
            title="Help"
            aria-current={pathname === "/help" ? "page" : undefined}
            className={cn(
              iconLinkClassName,
              pathname === "/help" && "bg-surface-subtle text-text-primary",
            )}
          >
            <HelpIcon />
            <span className="sr-only">Help</span>
          </Link>
        </li>
        {isManager ? (
          <li>
            <Link
              href="/config"
              title="Manage"
              aria-current={pathname === "/config" ? "page" : undefined}
              className={cn(
                iconLinkClassName,
                pathname === "/config" && "bg-surface-subtle text-text-primary",
              )}
            >
              <ManageIcon />
              <span className="sr-only">Manage</span>
            </Link>
          </li>
        ) : null}
        {isSignedIn ? (
          <li>
            <Link
              href="/account"
              title="Account"
              aria-current={pathname === "/account" ? "page" : undefined}
              className={cn(
                iconLinkClassName,
                pathname === "/account" && "bg-surface-subtle text-text-primary",
              )}
            >
              <AccountIcon />
              <span className="sr-only">Account</span>
            </Link>
          </li>
        ) : (
          <li>
            <Link
              href="/sign-in"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-action-primary px-4 py-2 text-sm font-medium text-text-inverse no-underline hover:bg-action-primary-hover"
            >
              Sign in
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}
