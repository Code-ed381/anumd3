"use client";

import { useEffect, useMemo, useState } from "react";
import { DishCard } from "@/components/dish-card";
import { SiteHeader } from "@/components/site-header";
import { useCart } from "@/lib/cart";
import { formatGhs } from "@/lib/money";

export type ScheduleDay = {
  date: string;
  dateLabel: string;
  isOverride: boolean;
  cancelled: boolean;
  note: string | null;
  dishes: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    photoUrl: string | null;
  }[];
};

type MenuScheduleProps = {
  businessName: string;
  schedule: ScheduleDay[];
};

function firstOrderableDay(schedule: ScheduleDay[]) {
  return schedule.find((day) => !day.cancelled && day.dishes.length > 0) ?? null;
}

export function MenuSchedule({ businessName, schedule }: MenuScheduleProps) {
  const { pickupDate: cartPickupDate, count, total, clear, ready } = useCart();

  const orderableDays = useMemo(
    () => schedule.filter((day) => !day.cancelled && day.dishes.length > 0),
    [schedule],
  );

  const nextDay = firstOrderableDay(schedule);
  const [selectedDate, setSelectedDate] = useState<string | null>(
    nextDay?.date ?? null,
  );

  useEffect(() => {
    if (!ready || orderableDays.length === 0) return;
    if (cartPickupDate && orderableDays.some((day) => day.date === cartPickupDate)) {
      setSelectedDate(cartPickupDate);
      return;
    }
    setSelectedDate((current) => {
      if (current && orderableDays.some((day) => day.date === current)) {
        return current;
      }
      return orderableDays[0]?.date ?? null;
    });
  }, [ready, cartPickupDate, orderableDays]);

  const selectedDay =
    schedule.find((day) => day.date === selectedDate) ?? nextDay;

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <p className="text-sm text-[color:var(--muted)]">
          Pre-order from {businessName} for delivery on your chosen day.
        </p>

        {count > 0 && cartPickupDate && (
          <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-sm">
            <p className="font-medium text-[color:var(--foreground)]">
              Cart for{" "}
              {schedule.find((d) => d.date === cartPickupDate)?.dateLabel ??
                cartPickupDate}
            </p>
            <p className="mt-1 text-stone-600">
              {count} item{count === 1 ? "" : "s"} · {formatGhs(total)}
            </p>
            <button
              type="button"
              onClick={clear}
              className="mt-2 text-sm text-stone-500 underline"
            >
              Clear cart
            </button>
          </div>
        )}

        {orderableDays.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-stone-500">
            No upcoming meals to pre-order right now. Check back soon.
          </div>
        ) : (
          <>
            <label className="mt-6 block">
              <span className="text-sm font-medium text-[color:var(--foreground)]">Delivery date</span>
              <select
                value={selectedDate ?? ""}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-3 text-sm"
              >
                {orderableDays.map((day) => (
                  <option key={day.date} value={day.date}>
                    {day.dateLabel}
                    {day.isOverride ? " · Special" : ""}
                    {day.date === nextDay?.date ? " · Next available" : ""}
                  </option>
                ))}
              </select>
            </label>

            {selectedDay && (
              <section className="mt-6">
                <h2 className="text-lg font-semibold text-[color:var(--brand-green-dark)]">
                  {selectedDay.date === nextDay?.date
                    ? `Next up — ${selectedDay.dateLabel}`
                    : selectedDay.dateLabel}
                </h2>
                {selectedDay.note && (
                  <p className="mt-1 text-sm text-stone-500">{selectedDay.note}</p>
                )}
                {selectedDay.isOverride && (
                  <p className="mt-1 text-sm text-amber-700">Special menu this day</p>
                )}
                <div className="mt-4 grid gap-4">
                  {selectedDay.dishes.map((dish) => (
                    <DishCard
                      key={dish.id}
                      {...dish}
                      pickupDate={selectedDay.date}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <p className="mt-10 pb-8 text-center text-xs text-stone-400">
          Kitchen staff?{" "}
          <a href="/owner/login" className="underline">
            Sign in
          </a>
        </p>
      </main>
    </div>
  );
}
