"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isModifiedClick(event: MouseEvent): boolean {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  );
}

export function RouteFade({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const pendingHref = useRef<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    pendingHref.current = null;
    setLeaving(false);
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/") {
      router.prefetch("/");
    }
  }, [pathname, router]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (isModifiedClick(event) || event.defaultPrevented) return;
      const link = (event.target as Element | null)?.closest("a");
      if (
        !link ||
        link.target === "_blank" ||
        link.hasAttribute("download") ||
        link.getAttribute("rel")?.includes("external")
      ) {
        return;
      }

      const hrefAttr = link.getAttribute("href");
      if (!hrefAttr || hrefAttr.startsWith("#")) return;

      let url: URL;
      try {
        url = new URL(hrefAttr, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search &&
        url.hash === window.location.hash
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const href = `${url.pathname}${url.search}${url.hash}`;
      if (pendingHref.current) return;
      pendingHref.current = href;
      router.prefetch(href);

      if (prefersReducedMotion()) {
        router.push(href);
        return;
      }

      flushSync(() => {
        setLeaving(true);
      });
      router.push(href);
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  return (
    <div
      className={cn(
        "route-fade-root flex h-full min-h-0 flex-1 flex-col",
        leaving && "is-leaving",
      )}
    >
      {children}
    </div>
  );
}
