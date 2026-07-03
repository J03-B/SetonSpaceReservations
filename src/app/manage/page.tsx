import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";

export const metadata = {
  title: "Manage",
};

export default async function ManagePage() {
  const session = await getSessionUser();

  if (!session?.isManager) {
    redirect("/sign-in?next=/manage");
  }

  return (
    <div className="mx-auto max-w-4xl overflow-y-auto px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-semibold">Manage</h1>
      <p className="mt-2 text-text-secondary">
        Review reservation requests, approve or decline, and manage your assigned
        spaces.
      </p>

      <div className="mt-8 rounded-lg border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Manager dashboard</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Full manager workflows are coming in Phase 3 (master plan). Signed in
          as {session.email}.
        </p>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-text-secondary">
          <li>New requests</li>
          <li>Under review</li>
          <li>Upcoming reservations</li>
          <li>Availability blocks</li>
        </ul>
      </div>

      <Link
        href="/"
        className="mt-8 inline-flex min-h-11 items-center text-sm font-medium text-action-primary no-underline hover:underline"
      >
        Back to map
      </Link>
    </div>
  );
}
