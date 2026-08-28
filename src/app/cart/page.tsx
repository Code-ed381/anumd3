"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { useCart } from "@/lib/cart";
import { formatGhs } from "@/lib/money";
import { formatScheduleDate } from "@/lib/schedule";

export default function CartPage() {
  const { items, setQuantity, removeItem, total, count, pickupDate } = useCart();
  const pickupLabel = pickupDate ? formatScheduleDate(pickupDate) : null;

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader compact />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <h2 className="text-2xl font-semibold">Your cart</h2>
        {pickupLabel && (
          <p className="mt-1 text-sm text-stone-600">Pickup on {pickupLabel}</p>
        )}
        {items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
            <p className="text-stone-500">Your cart is empty.</p>
            <Link
              href="/menu"
              className="mt-4 inline-flex rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-white"
            >
              Browse menu
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-6 space-y-3">
              {items.map((item) => (
                <li
                  key={item.dishId}
                  className="flex gap-3 rounded-2xl border border-stone-200 bg-white p-3"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-100">
                    {item.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.photoUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm font-medium">
                        {formatGhs(item.price * item.quantity)}
                      </p>
                    </div>
                    <p className="text-sm text-stone-500">{formatGhs(item.price)} each</p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex items-center rounded-full bg-stone-100">
                        <button
                          type="button"
                          className="h-8 w-8"
                          onClick={() => setQuantity(item.dishId, item.quantity - 1)}
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <button
                          type="button"
                          className="h-8 w-8"
                          onClick={() => setQuantity(item.dishId, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.dishId)}
                        className="text-sm text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-base font-semibold">
                <span>
                  {count} item{count === 1 ? "" : "s"}
                </span>
                <span>{formatGhs(total)}</span>
              </div>
              <Link
                href="/checkout"
                className="mt-4 flex w-full items-center justify-center rounded-full bg-[color:var(--accent)] py-3 text-sm font-medium text-white"
              >
                Continue to checkout
              </Link>
              <Link
                href="/menu"
                className="mt-3 flex w-full items-center justify-center text-sm text-stone-600"
              >
                Add more dishes
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
