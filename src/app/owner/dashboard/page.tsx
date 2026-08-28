"use client";

import { useEffect, useState } from "react";
import { PushEnableButton } from "@/components/push-enable-button";
import { StatusBadge } from "@/components/status-badge";
import { formatGhs } from "@/lib/money";
import { displayGhanaPhone } from "@/lib/phone";

type OrderJson = {
  id: string;
  status: string;
  pickupDate: string;
  pickupTime: string;
  deliveryAddress: string | null;
  totalAmount: number;
  notes: string | null;
  customer: { name: string; phone: string };
  items: { id: string; name: string; quantity: number }[];
};

type Stats = {
  ordersToday: number;
  ordersThisWeek: number;
  revenueThisWeek: number;
};

const NEXT_STATUS: Record<string, string | null> = {
  PAID: "CONFIRMED",
  CONFIRMED: "READY",
  READY: "COMPLETED",
};

const NEXT_LABEL: Record<string, string> = {
  CONFIRMED: "Confirm",
  READY: "Mark ready",
  COMPLETED: "Complete",
};

export default function OwnerDashboardPage() {
  const [orders, setOrders] = useState<OrderJson[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [status, setStatus] = useState("ALL");
  const [date, setDate] = useState("");
  const [daySummary, setDaySummary] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (date) params.set("date", date);
    fetch(`/api/orders?${params.toString()}`)
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(
        ({
          ok,
          json,
        }: {
          ok: boolean;
          json: { orders?: OrderJson[]; stats?: Stats; error?: string };
        }) => {
          if (cancelled) return;
          if (!ok) {
            setError(json.error || "Could not load orders");
            setLoading(false);
            return;
          }
          setOrders(json.orders || []);
          setStats(json.stats || null);
          setError("");
          setLoading(false);
        },
      )
      .catch(() => {
        if (!cancelled) {
          setError("Could not load orders");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [status, date]);

  useEffect(() => {
    if (!date) {
      setDaySummary("");
      return;
    }
    let cancelled = false;
    fetch(`/api/schedule?from=${encodeURIComponent(date)}&days=1`)
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(
        ({
          ok,
          json,
        }: {
          ok: boolean;
          json: {
            schedule?: {
              dateLabel: string;
              cancelled: boolean;
              dishes: { name: string }[];
            }[];
          };
        }) => {
          if (cancelled || !ok) return;
          const day = json.schedule?.[0];
          if (!day) {
            setDaySummary("");
            return;
          }
          const meal = day.cancelled
            ? "Kitchen closed"
            : day.dishes.length > 0
              ? day.dishes.map((dish) => dish.name).join(", ")
              : "No meal scheduled";
          setDaySummary(`${day.dateLabel} — ${meal}`);
        },
      )
      .catch(() => {
        if (!cancelled) setDaySummary("");
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  async function updateStatus(id: string, next: string) {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(json.error || "Could not update status");
      return;
    }
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (date) params.set("date", date);
    const listRes = await fetch(`/api/orders?${params.toString()}`);
    const listJson = (await listRes.json()) as {
      orders?: OrderJson[];
      stats?: Stats;
    };
    if (listRes.ok) {
      setOrders(listJson.orders || []);
      setStats(listJson.stats || null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Orders</h1>
      {stats && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Today" value={String(stats.ordersToday)} />
          <Stat label="This week" value={String(stats.ordersThisWeek)} />
          <Stat label="Revenue" value={formatGhs(stats.revenueThisWeek)} />
        </div>
      )}

      <div className="mt-4">
        <PushEnableButton />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm"
        >
          <option value="ALL">All statuses</option>
          <option value="PENDING">Awaiting payment</option>
          <option value="PAID">Paid</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="READY">Ready</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm"
        />
      </div>

      {daySummary && (
        <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-medium shadow-sm">
          {daySummary}
          {!loading && ` — ${orders.length} order${orders.length === 1 ? "" : "s"}`}
        </p>
      )}

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      {loading && <p className="mt-6 text-stone-500">Loading orders…</p>}

      <ul className="mt-6 space-y-3">
        {!loading && orders.length === 0 && (
          <li className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-center text-stone-500">
            No orders match these filters.
          </li>
        )}
        {orders.map((order) => {
          const next = NEXT_STATUS[order.status];
          return (
            <li
              key={order.id}
              className="rounded-2xl border border-stone-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{order.customer.name}</p>
                  <p className="text-sm text-stone-500">
                    {displayGhanaPhone(order.customer.phone)}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <p className="mt-2 text-sm">
                Delivery {order.pickupDate} at {order.pickupTime}
              </p>
              {order.deliveryAddress && (
                <p className="mt-1 text-sm text-stone-600">
                  {order.deliveryAddress}
                </p>
              )}
              <ul className="mt-2 text-sm text-stone-600">
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.quantity}× {item.name}
                  </li>
                ))}
              </ul>
              {order.notes && (
                <p className="mt-2 text-sm text-stone-500">Notes: {order.notes}</p>
              )}
              <p className="mt-2 font-semibold">{formatGhs(order.totalAmount)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {next && (
                  <button
                    type="button"
                    onClick={() => void updateStatus(order.id, next)}
                    className="rounded-full bg-[color:var(--brand-green-dark)] px-3 py-1.5 text-sm font-medium text-white"
                  >
                    {NEXT_LABEL[next]}
                  </button>
                )}
                {order.status !== "COMPLETED" &&
                  order.status !== "CANCELLED" && (
                    <button
                      type="button"
                      onClick={() => void updateStatus(order.id, "CANCELLED")}
                      className="rounded-full border border-red-200 px-3 py-1.5 text-sm text-red-700"
                    >
                      Cancel
                    </button>
                  )}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
