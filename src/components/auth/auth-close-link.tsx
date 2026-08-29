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

export function AuthPageTitle({ children }: { children: string }) {
  return (
    <h1 className="text-center text-5xl font-semibold tracking-tight text-text-primary sm:text-6xl">
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
      className={`relative mt-10 rounded-xl border border-border bg-surface px-10 pb-10 pt-16 sm:px-14 sm:pb-14 sm:pt-20 ${className}`}
      role={role}
    >
      <div className="absolute right-5 top-5 sm:right-7 sm:top-7">
        <AuthCloseLink />
      </div>
      {children}
    </div>
  );
}
