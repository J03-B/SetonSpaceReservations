import type { ReactNode } from "react";
import Link from "next/link";

export function AuthCloseLink() {
  return (
    <Link
      href="/"
      className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface text-text-primary no-underline hover:bg-surface-subtle"
      aria-label="Back to map"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4.5 4.5 13.5 13.5M13.5 4.5 4.5 13.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    </Link>
  );
}

export const authPageClassName =
  "flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-6 pb-20 pt-16 sm:pb-24 sm:pt-20";

export const authColumnClassName = "w-full max-w-md";

export function AuthPageTitle({ children }: { children: string }) {
  return (
    <h1 className="text-center text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
      {children}
    </h1>
  );
}

export function AuthFormCard({
  children,
  className = "",
  role,
}: {
  children: ReactNode;
  className?: string;
  role?: "status";
}) {
  return (
    <div
      className={`relative mt-6 rounded-xl border border-border bg-surface px-6 pb-8 pt-12 sm:px-8 sm:pb-10 sm:pt-14 ${className}`}
      role={role}
    >
      <div className="absolute right-4 top-4">
        <AuthCloseLink />
      </div>
      {children}
    </div>
  );
}
