import type { Metadata, Viewport } from "next";
import { DeveloperWatermark } from "@/components/layout/developer-watermark";
import { RouteFade } from "@/components/layout/route-fade";
import { SiteHeader } from "@/components/layout/site-header";
import { TempViewBanner } from "@/components/layout/temp-view-banner";
import { UnsupportedScreenGate } from "@/components/layout/unsupported-screen-gate";
import { getSessionUser } from "@/lib/auth/session";
import { BRAND } from "@/lib/brand";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: BRAND.name,
    template: `%s · ${BRAND.name}`,
  },
  description:
    "View campus space availability on the map and submit reservation requests.",
  icons: {
    icon: [{ url: BRAND.logoSrc, type: "image/png" }],
    apple: BRAND.logoSrc,
    shortcut: BRAND.logoSrc,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSessionUser();

  return (
    <html lang="en" className="h-full">
      <body className="flex h-full flex-col overflow-hidden bg-surface-subtle text-text-primary">
        <UnsupportedScreenGate>
          <SiteHeader
            isSignedIn={Boolean(session)}
            isManager={session?.isManager ?? false}
          />
          {session?.isImpersonating ? (
            <TempViewBanner
              fullName={session.fullName}
              email={session.email}
            />
          ) : null}
          <main className="page-main flex min-h-0 flex-1 flex-col overflow-hidden bg-surface-subtle">
            <RouteFade>{children}</RouteFade>
          </main>
          <DeveloperWatermark />
        </UnsupportedScreenGate>
      </body>
    </html>
  );
}
