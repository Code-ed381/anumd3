import { addDaysToDateString, todayInAccra } from "@/lib/pickup";
import { db, throwIfError } from "@/lib/db";
import type { DishRow, MealScheduleOverrideRow } from "@/lib/types";

const ACCRA = "Africa/Accra";

export const WEEKDAY_LABELS: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

export const WEEKDAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

export type ResolvedDay = {
  date: string;
  weekday: number;
  dishes: DishRow[];
  isOverride: boolean;
  cancelled: boolean;
  note: string | null;
};

export type DaySchedule = ResolvedDay;

function parseIsoWeekday(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const weekday = utc.getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

export function getWeekdayForDate(date: string) {
  return parseIsoWeekday(date);
}

export function formatScheduleDate(date: string) {
  const weekday = WEEKDAY_LABELS[getWeekdayForDate(date)] ?? "";
  const [year, month, day] = date.split("-").map(Number);
  const label = new Intl.DateTimeFormat("en-GB", {
    timeZone: ACCRA,
    day: "numeric",
    month: "short",
  }).format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)));
  return `${weekday} ${label}`;
}

export function formatWeekdaySummary(weekdays: number[]) {
  const sorted = [...weekdays].sort((a, b) => a - b);
  return sorted.map((day) => WEEKDAY_LABELS[day] ?? String(day)).join(", ");
}

function normalizeServeWeekdays(weekdays: number[] | null | undefined) {
  if (!weekdays?.length) return [];
  return [...new Set(weekdays.filter((day) => day >= 1 && day <= 7))].sort(
    (a, b) => a - b,
  );
}

function overrideDateString(override: MealScheduleOverrideRow) {
  const value = override.serve_date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return value.slice(0, 10);
}

export function resolveMealsForDate(
  date: string,
  dishes: DishRow[],
  overrides: MealScheduleOverrideRow[],
): ResolvedDay {
  const weekday = getWeekdayForDate(date);
  const override = overrides.find(
    (row) => overrideDateString(row) === date,
  );

  if (override) {
    if (!override.dish_id) {
      return {
        date,
        weekday,
        dishes: [],
        isOverride: true,
        cancelled: true,
        note: override.note,
      };
    }
    const dish = dishes.find(
      (row) => row.id === override.dish_id && row.is_available,
    );
    return {
      date,
      weekday,
      dishes: dish ? [dish] : [],
      isOverride: true,
      cancelled: false,
      note: override.note,
    };
  }

  const recurring = dishes.filter(
    (dish) =>
      dish.is_available &&
      normalizeServeWeekdays(dish.serve_weekdays ?? []).includes(weekday),
  );

  return {
    date,
    weekday,
    dishes: recurring.sort((a, b) => a.name.localeCompare(b.name)),
    isOverride: false,
    cancelled: false,
    note: null,
  };
}

export function buildUpcomingSchedule(
  dishes: DishRow[],
  overrides: MealScheduleOverrideRow[],
  from = todayInAccra(),
  days = 14,
): DaySchedule[] {
  const schedule: DaySchedule[] = [];
  for (let offset = 0; offset < days; offset += 1) {
    const date = addDaysToDateString(from, offset);
    schedule.push(resolveMealsForDate(date, dishes, overrides));
  }
  return schedule;
}

export function dishAvailableOnDate(
  dishId: string,
  date: string,
  dishes: DishRow[],
  overrides: MealScheduleOverrideRow[],
) {
  const resolved = resolveMealsForDate(date, dishes, overrides);
  if (resolved.cancelled) return false;
  return resolved.dishes.some((dish) => dish.id === dishId);
}

export function upcomingDatesForDish(
  dishId: string,
  dishes: DishRow[],
  overrides: MealScheduleOverrideRow[],
  from = todayInAccra(),
  days = 14,
) {
  return buildUpcomingSchedule(dishes, overrides, from, days)
    .filter((day) => day.dishes.some((dish) => dish.id === dishId))
    .map((day) => day.date);
}

export function validateServeWeekdays(weekdays: unknown) {
  if (!Array.isArray(weekdays)) {
    return { ok: false as const, error: "serveWeekdays must be an array" };
  }
  const normalized = normalizeServeWeekdays(
    weekdays.map((day) => Number(day)),
  );
  if (normalized.length !== weekdays.length) {
    return {
      ok: false as const,
      error: "Each weekday must be a number from 1 (Mon) to 7 (Sun)",
    };
  }
  return { ok: true as const, value: normalized };
}

export function parseServeWeekdaysFromForm(value: FormDataEntryValue | null) {
  if (!value) return [];
  const raw = String(value).trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = validateServeWeekdays(parsed);
    return result.ok ? result.value : [];
  } catch {
    return [];
  }
}

export function serializeScheduleDay(day: ResolvedDay, dishes: DishRow[]) {
  return {
    date: day.date,
    weekday: day.weekday,
    weekdayLabel: WEEKDAY_LABELS[day.weekday] ?? "",
    dateLabel: formatScheduleDate(day.date),
    isOverride: day.isOverride,
    cancelled: day.cancelled,
    note: day.note,
    dishes: day.dishes.map((dish) => ({
      id: dish.id,
      name: dish.name,
      description: dish.description,
      price:
        typeof dish.price === "number" ? dish.price : Number(dish.price),
      photoUrl: dish.photo_url,
    })),
    defaultDishes: day.isOverride
      ? resolveMealsForDate(day.date, dishes, []).dishes.map((dish) => ({
          id: dish.id,
          name: dish.name,
        }))
      : [],
  };
}

export function serializeOverride(row: MealScheduleOverrideRow) {
  return {
    serveDate: overrideDateString(row),
    dishId: row.dish_id,
    note: row.note,
    createdAt: row.created_at,
  };
}

export async function loadScheduleData() {
  const [dishesResult, overridesResult] = await Promise.all([
    db().from("dishes").select("*").order("name", { ascending: true }),
    db()
      .from("meal_schedule_overrides")
      .select("*")
      .order("serve_date", { ascending: true }),
  ]);

  if (dishesResult.error) throw new Error(dishesResult.error.message);
  if (overridesResult.error) throw new Error(overridesResult.error.message);

  const dishes = (dishesResult.data ?? []) as DishRow[];
  const overrides = (overridesResult.data ?? []) as MealScheduleOverrideRow[];

  return { dishes, overrides };
}

export async function getSerializedSchedule(from?: string, days = 14) {
  const start = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : todayInAccra();
  const { dishes, overrides } = await loadScheduleData();
  const schedule = buildUpcomingSchedule(dishes, overrides, start, days);
  return {
    from: start,
    days,
    schedule: schedule.map((day) => serializeScheduleDay(day, dishes)),
  };
}
