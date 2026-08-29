import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { getPickupSettings, savePickupSettings } from "@/lib/business-settings";
import type { PickupSettings } from "@/lib/pickup";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const settings = await getPickupSettings();
  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const body = (await request.json()) as { settings?: Partial<PickupSettings> };
  if (!body.settings || typeof body.settings !== "object") {
    return NextResponse.json(
      { error: "settings object is required" },
      { status: 400 },
    );
  }

  const allowed = [
    "pickupStartHour",
    "pickupEndHour",
    "slotIntervalMinutes",
    "minLeadHours",
    "sameDayCutoffHour",
    "nextDayCutoffHour",
    "maxAdvanceDays",
  ] as const;

  const sanitized: Partial<PickupSettings> = {};
  for (const key of allowed) {
    const raw = body.settings[key];
    if (raw === undefined) continue;
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 0 || num > 24) {
      return NextResponse.json(
        { error: `${key} must be a number between 0 and 24` },
        { status: 400 },
      );
    }
    (sanitized as Record<string, number>)[key] = Math.round(num);
  }

  await savePickupSettings(sanitized);
  const settings = await getPickupSettings();
  return NextResponse.json({ settings });
}
