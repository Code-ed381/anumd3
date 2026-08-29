import { NextResponse } from "next/server";
import { getPickupSettings } from "@/lib/business-settings";
import { getPickupTimeSlots } from "@/lib/pickup";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getPickupSettings();
  const slots = getPickupTimeSlots(settings);
  return NextResponse.json({ slots, settings });
}
