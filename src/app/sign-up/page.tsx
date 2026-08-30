import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import {
  AuthFormCard,
  AuthPageTitle,
  authColumnClassName,
  authPageClassName,
} from "@/components/auth/auth-close-link";
import { SignUpForm } from "./sign-up-form";

export const metadata = {
  title: "Create account",
};

export default function SignUpPage() {
  const configured = isSupabaseConfigured();

  return (
    <div className={authPageClassName}>
      <div className={authColumnClassName}>
        <AuthPageTitle>Create account</AuthPageTitle>

        {!configured ? (
          <AuthFormCard role="status">
            <h2 className="text-lg font-semibold">Authentication not configured</h2>
            <p className="mt-2 text-sm text-text-secondary">
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

        <p className="mt-6 text-center text-sm text-text-secondary">
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
