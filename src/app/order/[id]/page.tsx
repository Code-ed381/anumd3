"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { StatusBadge } from "@/components/status-badge";
import { formatGhs } from "@/lib/money";
import { displayGhanaPhone } from "@/lib/phone";

type OrderJson = {
  id: string;
  status: string;
  pickupDate: string;
  pickupTime: string;
  totalAmount: number;
  notes: string | null;
  customer: { name: string; phone: string };
  items: { id: string; name: string; quantity: number; lineTotal: number }[];
  payment: { reference: string; status: string } | null;
};

export default function OrderSummaryPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderJson | null>(null);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/orders/${params.id}`);
      const json = (await res.json()) as { order?: OrderJson; error?: string };
      if (cancelled) return;
      if (!res.ok || !json.order) {
        setError(json.error || "Order not found");
        return;
      }
      setOrder(json.order);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function payNow() {
    if (!order) return;
    setPaying(true);
    setError("");
    try {
      const res = await fetch("/api/payments/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const json = (await res.json()) as {
        authorizationUrl?: string;
        error?: string;
      };
      if (!res.ok || !json.authorizationUrl) {
        throw new Error(json.error || "Could not start payment");
      }
      window.location.href = json.authorizationUrl;
    } catch (err) {
      setPaying(false);
      setError(err instanceof Error ? err.message : "Could not start payment");
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader compact />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        {paying && (
          <div className="mb-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
            Redirecting you to Paystack…
          </div>
        )}
        {!order && !error && <p className="text-stone-500">Loading order…</p>}
        {error && <p className="text-red-700">{error}</p>}
        {order && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold">Order summary</h2>
                <p className="mt-1 text-sm text-stone-500">
                  Pickup {order.pickupDate} at {order.pickupTime}
                </p>
              </div>
              <StatusBadge status={order.status} />
            </div>

            <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-4">
              <p className="font-medium">{order.customer.name}</p>
              <p className="text-sm text-stone-500">
                {displayGhanaPhone(order.customer.phone)}
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-2">
                    <span>
                      {item.quantity}× {item.name}
                    </span>
                    <span>{formatGhs(item.lineTotal)}</span>
                  </li>
                ))}
              </ul>
              {order.notes && (
                <p className="mt-3 text-sm text-stone-600">Notes: {order.notes}</p>
              )}
              <p className="mt-4 flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatGhs(order.totalAmount)}</span>
              </p>
            </div>

            {order.status === "PENDING" ? (
              <button
                type="button"
                onClick={() => void payNow()}
                disabled={paying}
                className="mt-6 w-full rounded-full bg-[color:var(--accent)] py-3 text-sm font-medium text-white disabled:opacity-60"
              >
                {paying ? "Opening Paystack…" : "Pay now"}
              </button>
            ) : (
              <p className="mt-6 text-sm text-stone-600">
                This order is already {order.status.toLowerCase()}.
              </p>
            )}
            <Link
              href="/menu"
              className="mt-4 flex w-full items-center justify-center text-sm text-stone-600"
            >
              Back to menu
            </Link>
          </>
        )}
      </main>
    </div>
  );
}
