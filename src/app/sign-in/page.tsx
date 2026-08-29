import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/auth/paths";
import { AuthFormCard, AuthPageTitle } from "@/components/auth/auth-close-link";
import { SignInForm } from "./sign-in-form";

export const metadata = {
  title: "Sign in",
};

function safeEmailParam(value: string | undefined): string {
  if (!value) return "";
  const email = value.trim().toLowerCase();
  if (!email.includes("@") || email.length > 254) return "";
  return email;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string; sent?: string }>;
}) {
  const params = await searchParams;
  const nextPath = safeInternalPath(params.next, "/account");
  const initialEmail = safeEmailParam(params.email);
  const initialCodeSent = params.sent === "1" && Boolean(initialEmail);
  const configured = isSupabaseConfigured();

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-6 py-12">
      <div className="w-full max-w-2xl">
        <AuthPageTitle>Sign in</AuthPageTitle>

        {!configured ? (
          <AuthFormCard role="status">
            <h2 className="text-2xl font-semibold">Authentication not configured</h2>
            <p className="mt-3 text-lg text-text-secondary">
              Add the Supabase project URL and publishable key to enable sign-in.
            </p>
            <Link
              href="/"
              className="mt-8 inline-flex min-h-12 items-center justify-center text-base font-medium text-action-primary no-underline hover:underline"
            >
              Back to map
            </Link>
          </AuthFormCard>
        ) : (
          <AuthFormCard>
            <SignInForm
              nextPath={nextPath}
              initialEmail={initialEmail}
              initialCodeSent={initialCodeSent}
            />
          </AuthFormCard>
        )}

        <p className="mt-8 text-center text-lg text-text-secondary">
          Don&apos;t have an account?{" "}
          <Link
            href="/sign-up"
            className="font-medium text-action-primary no-underline hover:underline"
          >
            Sign up now!
          </Link>
        </p>
      </div>
    </div>
  );
}
