"use client";

import { useEffect, useState } from "react";
import { useCart, type CartExtra } from "@/lib/cart";
import { formatGhs } from "@/lib/money";

type Extra = {
  id: string;
  name: string;
  price: number;
};

type DishCardProps = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  photoUrl: string | null;
  pickupDate: string;
};

export function DishCard({
  id,
  name,
  description,
  price,
  photoUrl,
  pickupDate,
}: DishCardProps) {
  const { items, addItem, setQuantity } = useCart();
  const inCart = items.find((item) => item.dishId === id);
  const [cartError, setCartError] = useState("");
  const [extras, setExtras] = useState<Extra[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/dishes/${id}/extras`)
      .then((r) => r.json())
      .then((json: { extras?: Extra[] }) => {
        if (!cancelled && json.extras) setExtras(json.extras);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);

  function toggleExtra(extraId: string) {
    setSelectedExtras((prev) => ({
      ...prev,
      [extraId]: prev[extraId] ? 0 : 1,
    }));
  }

  function setExtraQty(extraId: string, qty: number) {
    setSelectedExtras((prev) => {
      const next = { ...prev };
      if (qty < 1) {
        delete next[extraId];
      } else {
        next[extraId] = qty;
      }
      return next;
    });
  }

  function buildExtras(): CartExtra[] {
    return extras
      .filter((e) => selectedExtras[e.id])
      .map((e) => ({
        extraId: e.id,
        name: e.name,
        price: e.price,
        quantity: selectedExtras[e.id] ?? 1,
      }));
  }

  function handleAdd() {
    const cartExtras = buildExtras();
    const result = addItem(
      { dishId: id, name, price, photoUrl },
      pickupDate,
      1,
      cartExtras,
    );
    if (!result.ok) {
      setCartError(result.error);
      return;
    }
    setCartError("");
    setSelectedExtras({});
  }

  const extrasTotal = extras
    .filter((e) => selectedExtras[e.id])
    .reduce((sum, e) => sum + e.price * (selectedExtras[e.id] ?? 1), 0);

  return (
    <article className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-sm">
      <div className="aspect-[16/10] bg-stone-100">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-stone-400">
            No photo
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold">{name}</h2>
          <p className="shrink-0 font-semibold text-[color:var(--brand-green)]">
            {formatGhs(price)}
          </p>
        </div>
        {description && (
          <p className="mt-1 text-sm leading-6 text-stone-600">{description}</p>
        )}

        {extras.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-xs font-medium text-stone-500">Extras</p>
            {extras.map((extra) => {
              const qty = selectedExtras[extra.id] ?? 0;
              return (
                <div key={extra.id} className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => toggleExtra(extra.id)}
                    className={`flex items-center gap-2 ${qty > 0 ? "font-medium" : "text-stone-600"}`}
                  >
                    <span
                      className={`inline-flex h-4 w-4 items-center justify-center rounded border text-xs ${
                        qty > 0
                          ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-white"
                          : "border-stone-300"
                      }`}
                    >
                      {qty > 0 && "✓"}
                    </span>
                    {extra.name}
                    <span className="text-stone-500">
                      {extra.price > 0 ? `+${formatGhs(extra.price)}` : "Free"}
                    </span>
                  </button>
                  {qty > 0 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setExtraQty(extra.id, qty - 1)}
                        className="h-6 w-6 rounded-full bg-stone-100 text-sm"
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-xs">{qty}</span>
                      <button
                        type="button"
                        onClick={() => setExtraQty(extra.id, qty + 1)}
                        className="h-6 w-6 rounded-full bg-stone-100 text-sm"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {extrasTotal > 0 && (
          <p className="mt-2 text-xs text-stone-500">
            Extras: {formatGhs(extrasTotal)}
          </p>
        )}

        {cartError && (
          <p className="mt-2 text-sm text-red-700">{cartError}</p>
        )}
        {inCart ? (
          <div className="mt-4 flex items-center justify-between rounded-full bg-stone-100 px-2 py-1">
            <button
              type="button"
              className="h-9 w-9 rounded-full bg-white text-lg"
              onClick={() => setQuantity(id, inCart.quantity - 1)}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="text-sm font-medium">{inCart.quantity} in cart</span>
            <button
              type="button"
              className="h-9 w-9 rounded-full bg-white text-lg"
              onClick={() => setQuantity(id, inCart.quantity + 1)}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            className="mt-4 w-full rounded-full bg-[color:var(--accent)] py-2.5 text-sm font-medium text-white"
          >
            Add to cart
          </button>
        )}
      </div>
    </article>
  );
}
