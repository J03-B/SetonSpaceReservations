import Link from "next/link";

export const metadata = {
  title: "Help",
};

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl overflow-y-auto px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-semibold">Help</h1>
      <p className="mt-2 text-text-secondary">
        Use the campus map to see which spaces are open, pending, or taken.
      </p>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold">Map colors</h2>
        <ul className="space-y-2 text-text-secondary">
          <li>
            <strong className="text-status-available">Green — Open</strong>{" "}
            The space is available at the selected time.
          </li>
          <li>
            <strong className="text-status-pending">Yellow — Pending</strong> A
            reservation request is awaiting manager approval.
          </li>
          <li>
            <strong className="text-status-danger">Red — Taken</strong> An
            approved reservation occupies this time.
          </li>
        </ul>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold">Time slider</h2>
        <p className="text-text-secondary">
          Drag the slider to explore availability at different times. Use{" "}
          <strong className="text-text-primary">Jump to now</strong> to return to
          the current time.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold">Time range</h2>
        <p className="text-text-secondary">
          Switch to Time range mode and pick a start and end. Spaces stay green
          only if they are open for the entire period.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold">Request a space</h2>
        <p className="text-text-secondary">
          Click a room on the map, review its schedule, then sign in to submit a
          reservation request. Submission does not guarantee approval — a space
          manager must approve every request.
        </p>
      </section>

      <Link
        href="/configure/map"
        className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-action-primary no-underline hover:underline"
      >
        Configure map rooms
      </Link>

      <Link
        href="/"
        className="mt-8 inline-flex min-h-11 items-center text-sm font-medium text-action-primary no-underline hover:underline"
      >
        Back to map
      </Link>
    </div>
  );
}
