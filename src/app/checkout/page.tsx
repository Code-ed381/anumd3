"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PhoneOtpVerify, phonesMatch } from "@/components/phone-otp-verify";
import { SiteHeader } from "@/components/site-header";
import { useCart } from "@/lib/cart";
import { formatGhs } from "@/lib/money";
import { normalizeGhanaPhone } from "@/lib/phone";
import { formatScheduleDate } from "@/lib/schedule";
import { type PickupSettings, DEFAULT_SETTINGS, getPickupTimeSlots, validatePickup } from "@/lib/pickup";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clear, pickupDate } = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sessionPhone233, setSessionPhone233] = useState<string | null>(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [pickupTime, setPickupTime] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<string[]>(() => getPickupTimeSlots());
  const [pickupSettings, setPickupSettings] = useState<PickupSettings>(DEFAULT_SETTINGS);

  const deliveryDateLabel = pickupDate ? formatScheduleDate(pickupDate) : "";

  useEffect(() => {
    let cancelled = false;
    fetch("/api/pickup-slots")
      .then((r) => r.json())
      .then(
        (json: { slots?: string[]; settings?: PickupSettings }) => {
          if (cancelled) return;
          if (json.slots) setSlots(json.slots);
          if (json.settings) setPickupSettings(json.settings);
        },
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/customer/session")
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(
        ({
          ok,
          json,
        }: {
          ok: boolean;
          json: { phone?: string; normalizedPhone?: string };
        }) => {
          if (cancelled || !ok) return;
          if (json.normalizedPhone) {
            setSessionPhone233(json.normalizedPhone);
            setPhone(json.phone || "");
            setPhoneVerified(true);
          }
        },
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function handlePhoneChange(value: string) {
    setPhone(value);
    if (sessionPhone233 && phonesMatch(sessionPhone233, value)) {
      setPhoneVerified(true);
    } else {
      setPhoneVerified(false);
    }
  }

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
    if (!phoneVerified) {
      setError("Verify your phone number before placing your order.");
      return;
    }
    if (deliveryAddress.trim().length < 10) {
      setError("Enter a precise delivery address.");
      return;
    }
    if (!addressConfirmed) {
      setError("Confirm that your delivery address is correct.");
      return;
    }
    const pickupError = validatePickup(pickupDate, pickupTime, pickupSettings);
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
          deliveryAddress: deliveryAddress.trim(),
          pickupDate,
          pickupTime,
          notes: notes.trim() || undefined,
          items: items.map((item) => ({
            dishId: item.dishId,
            quantity: item.quantity,
            extras: item.extras.map((e) => ({
              extraId: e.extraId,
              quantity: e.quantity,
            })),
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
        <SiteHeader />
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
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <h2 className="text-2xl font-semibold">Checkout</h2>
        <p className="mt-1 text-sm text-stone-600">
          Delivery on {deliveryDateLabel}. Choose a delivery time below.
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
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium">
                Phone{phoneVerified ? " ✓" : ""}
              </span>
              <input
                required
                value={phone}
                onChange={(event) => handlePhoneChange(event.target.value)}
                placeholder="0241234567"
                inputMode="tel"
                disabled={phoneVerified}
                className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-3 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-500"
                autoComplete="tel"
              />
            </label>
            {!phoneVerified && (
              <PhoneOtpVerify
                phone={phone}
                verified={phoneVerified}
                compact
                onVerified={() => {
                  const normalized = normalizeGhanaPhone(phone);
                  if (normalized) {
                    setSessionPhone233(normalized);
                    setPhoneVerified(true);
                  }
                }}
              />
            )}
          </div>
          <label className="block">
            <span className="text-sm font-medium">Delivery address</span>
            <textarea
              required
              value={deliveryAddress}
              onChange={(event) => setDeliveryAddress(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-3"
              placeholder="House number, street, landmark, area, city"
            />
            <span className="mt-1 block text-xs text-stone-500">
              Be as precise as possible so we can find you.
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={addressConfirmed}
              onChange={(event) => setAddressConfirmed(event.target.checked)}
              className="mt-1"
            />
            <span>
              I confirm this delivery address is correct. We are not liable for
              failed or delayed delivery caused by incorrect or incomplete
              address details.
            </span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium">Delivery date</span>
              <input
                type="text"
                readOnly
                value={deliveryDateLabel}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-stone-700"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Delivery time</span>
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
              placeholder="Gate code, directions, spice level, etc."
            />
          </label>

          <div className="rounded-2xl bg-white p-4">
            <p className="font-medium">Order preview</p>
            <ul className="mt-2 space-y-2 text-sm text-stone-600">
              {items.map((item) => (
                <li key={item.dishId}>
                  <div className="flex justify-between gap-2">
                    <span>
                      {item.quantity}× {item.name}
                    </span>
                    <span>{formatGhs(item.price * item.quantity)}</span>
                  </div>
                  {item.extras.length > 0 && (
                    <ul className="ml-4 mt-0.5 space-y-0.5 text-xs text-stone-500">
                      {item.extras.map((extra) => (
                        <li key={extra.extraId} className="flex justify-between gap-2">
                          <span>
                            {extra.quantity}× {extra.name}
                          </span>
                          <span>{formatGhs(extra.price * extra.quantity * item.quantity)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
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
            disabled={loading || !phoneVerified}
            className="w-full rounded-full bg-[color:var(--accent)] py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "Placing order…" : "Place order"}
          </button>
        </form>
      </main>
    </div>
  );
}
