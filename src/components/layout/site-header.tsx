import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

interface SiteHeaderProps {
  isManager?: boolean;
}

export function SiteHeader({ isManager = false }: SiteHeaderProps) {
  return (
    <header className="shrink-0 border-b border-border bg-surface">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <Image
            src={BRAND.logoSrc}
            alt={BRAND.logoAlt}
            width={120}
            height={48}
            className="h-10 w-auto"
            priority
          />
          <span className="text-lg font-semibold text-text-primary">
            {BRAND.name}
          </span>
        </Link>

        <nav aria-label="Account navigation">
          <ul className="flex items-center gap-1 sm:gap-2">
            {isManager ? (
              <li>
                <Link
                  href="/manage"
                  className="inline-flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-medium text-text-secondary no-underline hover:bg-surface-subtle hover:text-text-primary"
                >
                  Manage
                </Link>
              </li>
            ) : null}
            <li>
              <Link
                href="/help"
                className="inline-flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-medium text-text-secondary no-underline hover:bg-surface-subtle hover:text-text-primary"
              >
                Help
              </Link>
            </li>
            <li>
              <Link
                href="/sign-in"
                className={cn(
                  "inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2 text-sm font-medium no-underline",
                  "bg-action-primary text-text-inverse hover:bg-action-primary-hover",
                )}
              >
                Sign in
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
