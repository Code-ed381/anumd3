"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { formatGhs } from "@/lib/money";
import { getBusinessName } from "@/lib/config";

export function SiteHeader({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { count, total } = useCart();
  const name = getBusinessName();

  return (
    <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-[color:var(--background)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
        <Link href="/menu" className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[color:var(--accent)]">
            Pre-order
          </p>
          <h1 className="truncate text-lg font-semibold leading-tight">{name}</h1>
        </Link>
        {compact ? (
          <Link
            href="/my-orders"
            className="shrink-0 rounded-full px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100"
          >
            Orders
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/my-orders"
              className="rounded-full px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100"
            >
              Orders
            </Link>
            <Link
              href="/cart"
              className="relative flex items-center gap-2 rounded-full bg-[color:var(--accent)] px-3 py-2 text-sm font-medium text-white"
            >
            Cart
            {count > 0 && (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                {count} · {formatGhs(total)}
              </span>
            )}
          </Link>
          </div>
        )}
      </div>
    </header>
  );
}
