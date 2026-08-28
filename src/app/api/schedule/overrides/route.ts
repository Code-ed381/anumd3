import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { db, must, throwIfError } from "@/lib/db";
import {
  buildUpcomingSchedule,
  loadScheduleData,
  serializeOverride,
  serializeScheduleDay,
} from "@/lib/schedule";
import { addDaysToDateString, todayInAccra } from "@/lib/pickup";
import type { MealScheduleOverrideRow } from "@/lib/types";

export const dynamic = "force-dynamic";

type OverrideBody = {
  serveDate?: string;
  dishId?: string | null;
  note?: string | null;
};

function parseDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  return value;
}

export async function GET(request: Request) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const from = parseDate(searchParams.get("from") || undefined) ?? todayInAccra();
  const daysRaw = Number(searchParams.get("days") || "28");
  const days =
    Number.isFinite(daysRaw) && daysRaw > 0 && daysRaw <= 56
      ? Math.floor(daysRaw)
      : 28;

  try {
    const { dishes, overrides } = await loadScheduleData();
    const schedule = buildUpcomingSchedule(dishes, overrides, from, days);
    return NextResponse.json({
      from,
      days,
      schedule: schedule.map((day) => serializeScheduleDay(day, dishes)),
      overrides: overrides.map(serializeOverride),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load schedule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const body = (await request.json()) as OverrideBody;
  const serveDate = parseDate(body.serveDate);
  if (!serveDate) {
    return NextResponse.json(
      { error: "serveDate must be YYYY-MM-DD" },
      { status: 400 },
    );
  }

  const minDate = todayInAccra();
  const maxDate = addDaysToDateString(minDate, 56);
  if (serveDate < minDate || serveDate > maxDate) {
    return NextResponse.json(
      { error: "Override date must be within the next 56 days" },
      { status: 400 },
    );
  }

  const dishId =
    body.dishId === undefined ? undefined : body.dishId === null ? null : body.dishId;
  if (dishId) {
    const dish = throwIfError(
      await db().from("dishes").select("id").eq("id", dishId).maybeSingle(),
    );
    if (!dish) {
      return NextResponse.json({ error: "Dish not found" }, { status: 404 });
    }
  }

  const note =
    body.note === undefined ? null : body.note?.trim() ? body.note.trim() : null;

  const row = must(
    throwIfError(
      await db()
        .from("meal_schedule_overrides")
        .upsert(
          {
            serve_date: serveDate,
            dish_id: dishId ?? null,
            note,
          },
          { onConflict: "serve_date" },
        )
        .select()
        .single(),
    ) as MealScheduleOverrideRow | null,
    "Could not save override",
  );

  return NextResponse.json(
    { override: serializeOverride(row) },
    { status: 201 },
  );
}

export async function DELETE(request: Request) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const serveDate = parseDate(searchParams.get("date") || undefined);
  if (!serveDate) {
    return NextResponse.json(
      { error: "date query param must be YYYY-MM-DD" },
      { status: 400 },
    );
  }

  const { error } = await db()
    .from("meal_schedule_overrides")
    .delete()
    .eq("serve_date", serveDate);
  if (error) throw new Error(error.message);

  return NextResponse.json({ ok: true });
}
