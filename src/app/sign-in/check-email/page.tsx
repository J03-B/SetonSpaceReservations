import Link from "next/link";
import { ResendConfirmationForm } from "./resend-confirmation-form";

export const metadata = {
  title: "Confirm your email",
};

export default function CheckEmailPage() {
  return (
    <div className="mx-auto max-w-lg overflow-y-auto px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-semibold">Confirm your email</h1>
      <p className="mt-2 text-text-secondary">
        We sent a confirmation link to your email. Open that link to verify your
        address, then sign in. The link expires after a limited time.
      </p>

      <div className="mt-6 rounded-lg border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Did not receive the email?</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Check spam or promotions, then request a new confirmation email.
        </p>
        <ResendConfirmationForm />
      </div>

      <Link
        href="/sign-in"
        className="mt-8 inline-flex min-h-11 items-center text-sm font-medium text-action-primary no-underline hover:underline"
      >
        Back to sign in
      </Link>
    </div>
  );
}
