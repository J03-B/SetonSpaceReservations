import Link from "next/link";

export const metadata = {
  title: "Authentication error",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const description =
    message ??
    "Sign-in could not be completed. Try again, or request a new confirmation email.";

  return (
    <div className="mx-auto max-w-lg overflow-y-auto px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-semibold">Sign-in could not be completed</h1>
      <p className="mt-2 text-text-secondary" role="alert">
        {description}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/sign-in"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-action-primary px-4 py-2 text-sm font-medium text-text-inverse no-underline hover:bg-action-primary-hover"
        >
          Back to sign in
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-sm font-medium text-action-primary no-underline hover:underline"
        >
          Back to map
        </Link>
      </div>
    </div>
  );
}
