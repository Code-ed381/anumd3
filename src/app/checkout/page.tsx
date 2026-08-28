"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { useCart } from "@/lib/cart";
import { formatGhs } from "@/lib/money";
import { normalizeGhanaPhone } from "@/lib/phone";
import { formatScheduleDate } from "@/lib/schedule";
import { getPickupTimeSlots, validatePickup } from "@/lib/pickup";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clear, pickupDate } = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const slots = useMemo(() => getPickupTimeSlots(), []);
  const pickupDateLabel = pickupDate ? formatScheduleDate(pickupDate) : "";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }
    if (!pickupDate) {
      setError("Choose a meal day from the menu before checking out.");
      return;
    }
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!normalizeGhanaPhone(phone)) {
      setError("Enter a valid Ghana phone number.");
      return;
    }
    const pickupError = validatePickup(pickupDate, pickupTime);
    if (pickupError) {
      setError(pickupError);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone,
          email: email.trim() || undefined,
          pickupDate,
          pickupTime,
          notes: notes.trim() || undefined,
          items: items.map((item) => ({
            dishId: item.dishId,
            quantity: item.quantity,
          })),
        }),
      });
      const json = (await res.json()) as { error?: string; order?: { id: string } };
      if (!res.ok || !json.order) {
        throw new Error(json.error || "Could not create order");
      }
      clear();
      router.push(`/order/${json.order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create order");
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-full flex-col">
        <SiteHeader compact />
        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10 text-center">
          <p className="text-stone-500">Add dishes before checking out.</p>
          <Link
            href="/menu"
            className="mt-4 inline-flex rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-white"
          >
            Browse menu
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader compact />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <h2 className="text-2xl font-semibold">Checkout</h2>
        <p className="mt-1 text-sm text-stone-600">
          Pickup on {pickupDateLabel}. Choose a time below.
        </p>

        <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Name</span>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-3"
              autoComplete="name"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Phone</span>
            <input
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="0241234567"
              inputMode="tel"
              className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-3"
              autoComplete="tel"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Email (optional)</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-3"
              autoComplete="email"
            />
            <span className="mt-1 block text-xs text-stone-500">
              Used for the payment receipt. If you skip it, we generate a
              placeholder for Paystack.
            </span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium">Pickup date</span>
              <input
                type="text"
                readOnly
                value={pickupDateLabel}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-stone-700"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Pickup time</span>
              <select
                required
                value={pickupTime}
                onChange={(event) => setPickupTime(event.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-3"
              >
                <option value="">Select</option>
                {slots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-medium">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-3"
              placeholder="Spice level, extra pack, etc."
            />
          </label>

          <div className="rounded-2xl bg-white p-4">
            <p className="font-medium">Order preview</p>
            <ul className="mt-2 space-y-1 text-sm text-stone-600">
              {items.map((item) => (
                <li key={item.dishId} className="flex justify-between gap-2">
                  <span>
                    {item.quantity}× {item.name}
                  </span>
                  <span>{formatGhs(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex justify-between font-semibold">
              <span>Estimated total</span>
              <span>{formatGhs(total)}</span>
            </p>
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[color:var(--accent)] py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "Placing order…" : "Place order"}
          </button>
        </form>
      </main>
    </div>
  );
}
