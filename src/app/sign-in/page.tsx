import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata = {
  title: "Sign in",
};

export default function SignInPage() {
  const configured = isSupabaseConfigured();

  return (
    <main className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-semibold text-text-primary">Sign in</h1>
      <p className="mt-2 text-text-secondary">
        Sign in to submit reservation requests or check request status.
      </p>

      {!configured ? (
        <div
          className="mt-6 rounded-lg border border-border bg-surface p-6"
          role="status"
        >
          <h2 className="text-lg font-semibold">Authentication not configured</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Supabase Auth must be connected before sign-in is available. Seton
            SSO (Google Workspace or Microsoft Entra ID) will be integrated after
            the identity provider is confirmed — see master plan open decisions.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex min-h-11 items-center justify-center text-sm font-medium text-action-primary no-underline hover:underline"
          >
            Back to map
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4 rounded-lg border border-border bg-surface p-6">
          <section>
            <h2 className="text-lg font-semibold">Seton users</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Sign in with your Seton account. Verified Seton domain users
              automatically receive requester access.
            </p>
            <button
              type="button"
              disabled
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-action-primary px-4 py-2 text-sm font-medium text-text-inverse opacity-60"
            >
              Sign in with Seton SSO (pending configuration)
            </button>
          </section>
          <section className="border-t border-border pt-4">
            <h2 className="text-lg font-semibold">External users</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Create an account and submit a requester access application for
              Tech Admin review.
            </p>
            <button
              type="button"
              disabled
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border-strong bg-surface px-4 py-2 text-sm font-medium text-text-primary opacity-60"
            >
              Create account (Phase 2)
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
