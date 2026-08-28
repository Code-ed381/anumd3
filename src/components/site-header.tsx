"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";
import { getBusinessName } from "@/lib/config";

const NAV_LINK =
  "rounded-full px-3 py-2 text-sm font-medium text-[color:var(--brand-green-dark)] hover:bg-[color:var(--brand-green)]/10";

const NAV_LINK_ACTIVE =
  "rounded-full bg-[color:var(--brand-green)]/15 px-3 py-2 text-sm font-medium text-[color:var(--brand-green-dark)]";

export function SiteHeader() {
  const pathname = usePathname();
  const { count } = useCart();
  const name = getBusinessName();

  const onMenu = pathname === "/menu" || pathname === "/";
  const onOrders = pathname.startsWith("/my-orders");
  const onCart = pathname === "/cart";

  return (
    <header className="sticky top-0 z-20 border-b border-[color:var(--border)] bg-[color:var(--card)]/95 backdrop-blur">
      <div className="h-1 bg-[color:var(--brand-green-dark)]" aria-hidden />
      <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-3">
        <Link href="/menu" className="flex min-w-0 items-center gap-2.5">
          <Image
            src="/logo.jpeg"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-[color:var(--border)]"
            priority
          />
          <div className="min-w-0 hidden sm:block">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-green)]">
              Pre-order
            </p>
            <p className="truncate text-sm font-semibold leading-tight text-[color:var(--foreground)]">
              {name}
            </p>
          </div>
        </Link>

        <nav className="flex shrink-0 items-center gap-1">
          {!onMenu && (
            <Link href="/menu" className={NAV_LINK}>
              Menu
            </Link>
          )}
          {!onOrders && (
            <Link href="/my-orders" className={NAV_LINK}>
              Orders
            </Link>
          )}
          {onOrders && <span className={NAV_LINK_ACTIVE}>Orders</span>}
          <Link
            href="/cart"
            className={
              onCart
                ? `${NAV_LINK_ACTIVE} flex items-center gap-1.5`
                : "relative flex items-center gap-1.5 rounded-full bg-[color:var(--accent)] px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-[color:var(--accent-dark)]"
            }
          >
            Cart
            {count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs ${
                  onCart ? "bg-[color:var(--brand-green-dark)]/10" : "bg-white/20"
                }`}
              >
                {count}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
