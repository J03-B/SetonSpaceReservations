import Link from "next/link";

export function TempViewBanner({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) {
  return (
    <div
      className="shrink-0 border-b border-border bg-role-admin-bg px-4 py-2 text-sm text-role-admin sm:px-6"
      role="status"
    >
      Temporary view: you are seeing the site as {fullName} ({email}).{" "}
      <Link
        href="/account"
        className="font-medium text-role-admin underline-offset-2 hover:underline"
      >
        Disable temporary view
      </Link>
    </div>
  );
}
