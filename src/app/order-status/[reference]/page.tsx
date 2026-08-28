"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { StatusBadge } from "@/components/status-badge";
import { formatGhs } from "@/lib/money";

type OrderJson = {
  id: string;
  status: string;
  pickupDate: string;
  pickupTime: string;
  totalAmount: number;
  items: { id: string; name: string; quantity: number; lineTotal: number }[];
  payment: { reference: string; status: string; channel: string | null } | null;
};

export default function OrderStatusPage() {
  const params = useParams<{ reference: string }>();
  const [order, setOrder] = useState<OrderJson | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    async function check() {
      attempts += 1;
      const res = await fetch(
        `/api/payments/verify?reference=${encodeURIComponent(params.reference)}`,
      );
      const json = (await res.json()) as { order?: OrderJson; error?: string };
      if (cancelled) return;
      if (!res.ok || !json.order) {
        setError(json.error || "We could not find this payment yet.");
        setChecking(false);
        return;
      }
      setOrder(json.order);
      if (json.order.status === "PENDING" && attempts < 8) {
        setTimeout(() => {
          void check();
        }, 2500);
        return;
      }
      setChecking(false);
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [params.reference]);

  const paid = order && order.status !== "PENDING" && order.status !== "CANCELLED";
  const failed = order?.payment?.status === "failed";

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader compact />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <h2 className="text-2xl font-semibold">Payment status</h2>
        {checking && (
          <p className="mt-4 text-stone-600">Confirming your payment…</p>
        )}
        {error && !order && (
          <p className="mt-4 text-red-700">{error}</p>
        )}
        {order && (
          <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">Pickup {order.pickupDate} {order.pickupTime}</p>
              <StatusBadge status={order.status} />
            </div>
            <ul className="mt-4 space-y-1 text-sm">
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.quantity}× {item.name}
                </li>
              ))}
            </ul>
            <p className="mt-3 font-semibold">{formatGhs(order.totalAmount)}</p>
            {paid && (
              <p className="mt-4 text-sm text-emerald-800">
                Payment received. The kitchen has been notified.
              </p>
            )}
            {order.status === "PENDING" && !checking && (
              <p className="mt-4 text-sm text-amber-800">
                Payment is still pending. If you already paid, wait a moment and
                refresh this page. If you closed Paystack, you can pay from the
                order summary.
              </p>
            )}
            {failed && (
              <p className="mt-4 text-sm text-red-700">
                Payment failed. You can try again from the order summary.
              </p>
            )}
          </div>
        )}
        <div className="mt-6 flex flex-col gap-3">
          {order && (
            <Link
              href={`/order/${order.id}`}
              className="flex w-full items-center justify-center rounded-full bg-[color:var(--accent)] py-3 text-sm font-medium text-white"
            >
              View order
            </Link>
          )}
          <Link href="/menu" className="text-center text-sm text-stone-600">
            Back to menu
          </Link>
        </div>
      </main>
    </div>
  );
}
