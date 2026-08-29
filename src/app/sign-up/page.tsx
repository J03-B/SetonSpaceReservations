import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { AuthFormCard, AuthPageTitle } from "@/components/auth/auth-close-link";
import { SignUpForm } from "./sign-up-form";

export const metadata = {
  title: "Create account",
};

export default function SignUpPage() {
  const configured = isSupabaseConfigured();

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-6 py-12">
      <div className="w-full max-w-2xl">
        <AuthPageTitle>Create account</AuthPageTitle>

        {!configured ? (
          <AuthFormCard role="status">
            <h2 className="text-2xl font-semibold">Authentication not configured</h2>
            <p className="mt-3 text-lg text-text-secondary">
              Add the Supabase project URL and publishable key to enable sign-up.
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
            <SignUpForm />
          </AuthFormCard>
        )}

        <p className="mt-8 text-center text-lg text-text-secondary">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-medium text-action-primary no-underline hover:underline"
          >
            Sign in now!
          </Link>
        </p>
      </div>
    </div>
  );
}
