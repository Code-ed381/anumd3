import { NextResponse } from "next/server";
import { getSerializedSchedule } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json({ from: "", days: 0, schedule: [] });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || undefined;
  const daysRaw = Number(searchParams.get("days") || "14");
  const days =
    Number.isFinite(daysRaw) && daysRaw > 0 && daysRaw <= 56
      ? Math.floor(daysRaw)
      : 14;

  try {
    const payload = await getSerializedSchedule(from, days);
    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load schedule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
