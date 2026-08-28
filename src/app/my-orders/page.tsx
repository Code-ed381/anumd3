"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
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

type Step = "phone" | "code" | "orders";

export default function MyOrdersPage() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
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
    setOrders(json.orders || []);
    setStep("orders");
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/customer/orders")
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }: { ok: boolean; json: { orders?: OrderSummary[]; phone?: string } }) => {
        if (cancelled) return;
        if (ok) {
          setVerifiedPhone(json.phone || "");
          setOrders(json.orders || []);
          setStep("orders");
        }
        setCheckingSession(false);
      })
      .catch(() => {
        if (!cancelled) setCheckingSession(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function requestCode(event: FormEvent) {
    event.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const res = await fetch("/api/customer/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const json = (await res.json()) as {
        error?: string;
        message?: string;
        devCode?: string;
      };
      if (!res.ok) {
        throw new Error(json.error || "Could not send code");
      }
      setStep("code");
      setInfo(
        json.devCode
          ? `${json.message || "Code sent."} Dev code: ${json.devCode}`
          : json.message || "We sent a verification code to your phone.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/customer/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "Invalid code");
      }
      await loadOrders();
      setInfo("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await fetch("/api/customer/otp/verify", { method: "DELETE" });
    setOrders([]);
    setVerifiedPhone("");
    setPhone("");
    setCode("");
    setStep("phone");
    setError("");
    setInfo("");
  }

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader compact />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <h2 className="text-2xl font-semibold">Your orders</h2>
        <p className="mt-1 text-sm text-stone-600">
          Sign in with the phone number you use at checkout to see your order
          history.
        </p>

        {checkingSession && (
          <p className="mt-6 text-stone-500">Checking session…</p>
        )}

        {!checkingSession && step === "phone" && (
          <form onSubmit={(event) => void requestCode(event)} className="mt-6 space-y-4">
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
            {error && <p className="text-sm text-red-700">{error}</p>}
            {info && <p className="text-sm text-stone-600">{info}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[color:var(--accent)] py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send verification code"}
            </button>
          </form>
        )}

        {!checkingSession && step === "code" && (
          <form onSubmit={(event) => void verifyCode(event)} className="mt-6 space-y-4">
            {info && <p className="text-sm text-stone-600">{info}</p>}
            <label className="block">
              <span className="text-sm font-medium">6-digit code</span>
              <input
                required
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="123456"
                inputMode="numeric"
                maxLength={6}
                className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-3 tracking-widest"
              />
            </label>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[color:var(--accent)] py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading ? "Verifying…" : "View my orders"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setCode("");
                setError("");
              }}
              className="w-full text-sm text-stone-600"
            >
              Use a different number
            </button>
          </form>
        )}

        {!checkingSession && step === "orders" && (
          <div className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-stone-600">
                Signed in as <span className="font-medium">{verifiedPhone}</span>
              </p>
              <button
                type="button"
                onClick={() => void signOut()}
                className="text-sm text-stone-500 underline"
              >
                Sign out
              </button>
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
