"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PhoneOtpVerify } from "@/components/phone-otp-verify";
import { SiteHeader } from "@/components/site-header";
import { StatusBadge } from "@/components/status-badge";
import { formatGhs } from "@/lib/money";
import { formatScheduleDate } from "@/lib/schedule";

type OrderSummary = {
  id: string;
  status: string;
  pickupDate: string;
  pickupTime: string;
  totalAmount: number;
  createdAt: string;
  items: { name: string; quantity: number }[];
};

export default function MyOrdersPage() {
  const [phone, setPhone] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [error, setError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  async function loadOrders() {
    const res = await fetch("/api/customer/orders");
    const json = (await res.json()) as {
      orders?: OrderSummary[];
      phone?: string;
      error?: string;
    };
    if (!res.ok) {
      throw new Error(json.error || "Could not load orders");
    }
    setVerifiedPhone(json.phone || "");
    setPhone(json.phone || "");
    setPhoneVerified(true);
    setOrders(json.orders || []);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/customer/orders")
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(
        ({
          ok,
          json,
        }: {
          ok: boolean;
          json: { orders?: OrderSummary[]; phone?: string };
        }) => {
          if (cancelled) return;
          if (ok) {
            setVerifiedPhone(json.phone || "");
            setPhone(json.phone || "");
            setPhoneVerified(true);
            setOrders(json.orders || []);
          }
          setCheckingSession(false);
        },
      )
      .catch(() => {
        if (!cancelled) setCheckingSession(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function signOut() {
    await fetch("/api/customer/otp/verify", { method: "DELETE" });
    setOrders([]);
    setVerifiedPhone("");
    setPhone("");
    setPhoneVerified(false);
    setError("");
  }

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <h2 className="text-2xl font-semibold">Your orders</h2>
        <p className="mt-1 text-sm text-stone-600">
          If you already verified your number at checkout, your orders show here
          automatically. Otherwise, verify your phone once below.
        </p>

        {checkingSession && (
          <p className="mt-6 text-stone-500">Loading…</p>
        )}

        {!checkingSession && !phoneVerified && (
          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium">Phone number</span>
              <input
                required
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="0241234567"
                inputMode="tel"
                className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-3"
              />
            </label>
            <PhoneOtpVerify
              phone={phone}
              verified={phoneVerified}
              onVerified={() => {
                void loadOrders().catch((err) => {
                  setError(
                    err instanceof Error ? err.message : "Could not load orders",
                  );
                });
              }}
            />
            {error && <p className="text-sm text-red-700">{error}</p>}
          </div>
        )}

        {!checkingSession && phoneVerified && (
          <div className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-[color:var(--muted)]">
                Signed in as <span className="font-medium text-[color:var(--foreground)]">{verifiedPhone}</span>
              </p>
              <div className="flex items-center gap-3">
                <Link
                  href="/menu"
                  className="text-sm font-medium text-[color:var(--brand-green-dark)]"
                >
                  Menu
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="text-sm text-[color:var(--muted)] underline"
                >
                  Sign out
                </button>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-stone-500">
                No orders yet for this number.
                <Link href="/menu" className="mt-4 block text-[color:var(--accent)]">
                  Browse the menu
                </Link>
              </div>
            ) : (
              <ul className="mt-6 space-y-3">
                {orders.map((order) => (
                  <li
                    key={order.id}
                    className="rounded-2xl border border-stone-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {formatScheduleDate(order.pickupDate)} at{" "}
                          {order.pickupTime}
                        </p>
                        <p className="mt-1 text-sm text-stone-600">
                          {order.items
                            .map((item) => `${item.quantity}× ${item.name}`)
                            .join(", ")}
                        </p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="font-semibold">{formatGhs(order.totalAmount)}</p>
                      <Link
                        href={`/order/${order.id}`}
                        className="text-sm font-medium text-[color:var(--accent)]"
                      >
                        View details
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
