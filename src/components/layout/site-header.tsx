import Image from "next/image";
import Link from "next/link";
import { HeaderNav } from "@/components/layout/header-nav";
import { BRAND } from "@/lib/brand";

interface SiteHeaderProps {
  isSignedIn?: boolean;
  isManager?: boolean;
}

export function SiteHeader({
  isSignedIn = false,
  isManager = false,
}: SiteHeaderProps) {
  return (
    <header className="site-header shrink-0 border-b border-border bg-surface">
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
        <HeaderNav isSignedIn={isSignedIn} isManager={isManager} />
      </div>
    </header>
  );
}
