"use client";

export const QUEUE_PAGE_SIZE = 3;

export function pageQueue<T>(items: T[], page: number, pageSize = QUEUE_PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(0, page), pageCount - 1);
  return {
    pageCount,
    page: safePage,
    visible: items.slice(safePage * pageSize, safePage * pageSize + pageSize),
  };
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="size-5"
    >
      <path
        d={direction === "left" ? "M14 6 8 12l6 6" : "M10 6l6 6-6 6"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function QueuePager({
  page,
  pageCount,
  onPrevious,
  onNext,
}: {
  page: number;
  pageCount: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (pageCount <= 1) return null;

  return (
    <div className="mt-3 flex items-center justify-center gap-2">
      <button
        type="button"
        aria-label="Previous page"
        disabled={page <= 0}
        onClick={onPrevious}
        className="inline-flex size-11 items-center justify-center rounded-lg border border-border bg-surface text-text-primary hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Chevron direction="left" />
      </button>
      <p
        className="min-w-16 text-center text-sm text-text-secondary"
        aria-live="polite"
      >
        {page + 1} of {pageCount}
      </p>
      <button
        type="button"
        aria-label="Next page"
        disabled={page >= pageCount - 1}
        onClick={onNext}
        className="inline-flex size-11 items-center justify-center rounded-lg border border-border bg-surface text-text-primary hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Chevron direction="right" />
      </button>
    </div>
  );
}

export function PersonLines({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  return (
    <div className="min-w-0 flex-1 text-left">
      <p className="truncate whitespace-nowrap font-medium text-text-primary">
        {name}
      </p>
      <p className="mt-0.5 truncate whitespace-nowrap text-sm text-text-secondary">
        {email}
      </p>
    </div>
  );
}
