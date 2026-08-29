import Link from "next/link";

const LAYOUT_CARDS = [
  { href: "/?edit-mainmap", label: "Campus" },
  { href: "/?edit-building=main-building", label: "Main Building" },
  { href: "/?edit-building=corpus-christi", label: "Corpus Christi" },
  { href: "/?edit-building=divine-mercy-center", label: "Divine Mercy Center" },
  { href: "/?edit-building=carlo-acutis", label: "Carlo Acutis" },
] as const;

export function RoomLayoutCards() {
  return (
    <div className="flex flex-col gap-4">
      <ul className="grid grid-cols-2 gap-3">
        {LAYOUT_CARDS.map((card) => (
          <li key={card.href}>
            <Link
              href={card.href}
              className="flex min-h-11 items-center justify-center rounded-lg border border-border px-3 py-4 text-center text-sm font-medium text-text-primary no-underline hover:bg-surface-subtle"
            >
              {card.label}
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/configure/map"
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-action-primary px-4 py-2 text-sm font-medium text-text-inverse no-underline hover:bg-action-primary-hover"
      >
        Copy room code
      </Link>
    </div>
  );
}
