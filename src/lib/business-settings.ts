import { db } from "@/lib/db";
import {
  DEFAULT_SETTINGS,
  type PickupSettings,
} from "@/lib/pickup";
import type { BusinessSettingsRow } from "@/lib/types";

type SettingKey = keyof PickupSettings;
const SETTING_KEYS: SettingKey[] = [
  "pickupStartHour",
  "pickupEndHour",
  "slotIntervalMinutes",
  "minLeadHours",
  "sameDayCutoffHour",
  "nextDayCutoffHour",
  "maxAdvanceDays",
];

export async function getPickupSettings(): Promise<PickupSettings> {
  try {
    const rows = (
      await db()
        .from("business_settings")
        .select("key, value")
        .in("key", SETTING_KEYS)
    ).data as BusinessSettingsRow[] | null;

    if (!rows || rows.length === 0) return DEFAULT_SETTINGS;

    const merged = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      const key = row.key as SettingKey;
      const num = Number(row.value);
      if (Number.isFinite(num) && num > 0) {
        (merged as Record<string, number>)[key] = num;
      }
    }
    return merged;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function savePickupSettings(
  settings: Partial<PickupSettings>,
): Promise<void> {
  const upserts = Object.entries(settings)
    .filter(([key]) => SETTING_KEYS.includes(key as SettingKey))
    .map(([key, value]) => ({ key, value }));

  if (upserts.length === 0) return;

  const { error } = await db()
    .from("business_settings")
    .upsert(upserts, { onConflict: "key" });

  if (error) throw new Error(error.message);
}
