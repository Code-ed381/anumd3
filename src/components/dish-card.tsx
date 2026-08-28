"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";
import { formatGhs } from "@/lib/money";

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

  function handleAdd() {
    const result = addItem(
      { dishId: id, name, price, photoUrl },
      pickupDate,
    );
    if (!result.ok) {
      setCartError(result.error);
      return;
    }
    setCartError("");
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
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
          <p className="shrink-0 font-medium text-[color:var(--accent)]">
            {formatGhs(price)}
          </p>
        </div>
        {description && (
          <p className="mt-1 text-sm leading-6 text-stone-600">{description}</p>
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
