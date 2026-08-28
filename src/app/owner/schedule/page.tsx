"use client";

import { useEffect, useState } from "react";
import { formatWeekdaySummary } from "@/lib/schedule";

type ScheduleDay = {
  date: string;
  dateLabel: string;
  isOverride: boolean;
  cancelled: boolean;
  note: string | null;
  dishes: { id: string; name: string }[];
  defaultDishes: { id: string; name: string }[];
};

type DishOption = {
  id: string;
  name: string;
  isAvailable: boolean;
  serveWeekdays: number[];
};

export default function OwnerSchedulePage() {
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [dishes, setDishes] = useState<DishOption[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingDate, setSavingDate] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [scheduleRes, dishesRes] = await Promise.all([
        fetch("/api/schedule/overrides?days=28"),
        fetch("/api/dishes?all=1"),
      ]);
      const scheduleJson = (await scheduleRes.json()) as {
        schedule?: ScheduleDay[];
        error?: string;
      };
      const dishesJson = (await dishesRes.json()) as {
        dishes?: DishOption[];
        error?: string;
      };
      if (!scheduleRes.ok) {
        throw new Error(scheduleJson.error || "Could not load schedule");
      }
      if (!dishesRes.ok) {
        throw new Error(dishesJson.error || "Could not load dishes");
      }
      setSchedule(scheduleJson.schedule || []);
      setDishes(dishesJson.dishes || []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load schedule");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveOverride(
    serveDate: string,
    dishId: string | null,
    note?: string | null,
  ) {
    setSavingDate(serveDate);
    setError("");
    try {
      const res = await fetch("/api/schedule/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serveDate, dishId, note: note ?? null }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "Could not save override");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save override");
    } finally {
      setSavingDate(null);
    }
  }

  async function clearOverride(serveDate: string) {
    setSavingDate(serveDate);
    setError("");
    try {
      const res = await fetch(
        `/api/schedule/overrides?date=${encodeURIComponent(serveDate)}`,
        { method: "DELETE" },
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "Could not clear override");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not clear override");
    } finally {
      setSavingDate(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Schedule</h1>
      <p className="mt-1 text-sm text-stone-600">
        Override specific dates when the regular weekly menu changes or the
        kitchen is closed.
      </p>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      {loading && <p className="mt-6 text-stone-500">Loading schedule…</p>}

      <ul className="mt-6 space-y-3">
        {!loading && schedule.length === 0 && (
          <li className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-center text-stone-500">
            No upcoming dates to show.
          </li>
        )}
        {schedule.map((day) => {
          const defaultLabel =
            day.defaultDishes.length > 0
              ? day.defaultDishes.map((dish) => dish.name).join(", ")
              : "No regular meal";
          const currentLabel = day.cancelled
            ? "Closed"
            : day.dishes.length > 0
              ? day.dishes.map((dish) => dish.name).join(", ")
              : "No meal";

          return (
            <li
              key={day.date}
              className="rounded-2xl border border-stone-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{day.dateLabel}</p>
                  <p className="mt-1 text-sm text-stone-600">
                    Regular: {defaultLabel}
                  </p>
                  <p className="text-sm text-stone-800">
                    Showing: {currentLabel}
                    {day.isOverride ? " (override)" : ""}
                  </p>
                  {day.note && (
                    <p className="mt-1 text-xs text-stone-500">{day.note}</p>
                  )}
                </div>
                {day.isOverride && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    Override
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <select
                  disabled={savingDate === day.date}
                  defaultValue=""
                  onChange={(event) => {
                    const value = event.target.value;
                    if (!value) return;
                    void saveOverride(day.date, value === "__closed__" ? null : value);
                    event.target.value = "";
                  }}
                  className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Change this day…</option>
                  {dishes
                    .filter((dish) => dish.isAvailable)
                    .map((dish) => (
                      <option key={dish.id} value={dish.id}>
                        Serve {dish.name}
                        {dish.serveWeekdays.length
                          ? ` (${formatWeekdaySummary(dish.serveWeekdays)})`
                          : ""}
                      </option>
                    ))}
                  <option value="__closed__">Close kitchen</option>
                </select>
                {day.isOverride && (
                  <button
                    type="button"
                    disabled={savingDate === day.date}
                    onClick={() => void clearOverride(day.date)}
                    className="rounded-full border border-stone-300 px-3 py-2 text-sm"
                  >
                    Use regular schedule
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
