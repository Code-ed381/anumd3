const ACCRA = "Africa/Accra";

export const DEFAULT_SETTINGS = {
  pickupStartHour: 10,
  pickupEndHour: 20,
  slotIntervalMinutes: 30,
  minLeadHours: 4,
  sameDayCutoffHour: 14,
  nextDayCutoffHour: 20,
  maxAdvanceDays: 14,
} as const;

export type PickupSettings = {
  pickupStartHour: number;
  pickupEndHour: number;
  slotIntervalMinutes: number;
  minLeadHours: number;
  sameDayCutoffHour: number;
  nextDayCutoffHour: number;
  maxAdvanceDays: number;
};

function accraParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ACCRA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

export function todayInAccra() {
  const { year, month, day } = accraParts();
  return `${year}-${month}-${day}`;
}

export function addDaysToDateString(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return utc.toISOString().slice(0, 10);
}

export function getPickupTimeSlots(settings?: PickupSettings) {
  const s = settings ?? DEFAULT_SETTINGS;
  const slots: string[] = [];
  for (let hour = s.pickupStartHour; hour <= s.pickupEndHour; hour += 1) {
    slots.push(`${String(hour).padStart(2, "0")}:00`);
    if (s.slotIntervalMinutes === 30 && hour < s.pickupEndHour) {
      slots.push(`${String(hour).padStart(2, "0")}:30`);
    }
  }
  return slots;
}

export function dateStringToUtcNoon(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function utcDateToDateString(date: Date | string) {
  const iso = typeof date === "string" ? date : date.toISOString();
  return iso.slice(0, 10);
}

export function validatePickup(
  pickupDate: string,
  pickupTime: string,
  settings?: PickupSettings,
) {
  const s = settings ?? DEFAULT_SETTINGS;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pickupDate)) {
    return "Choose a valid pickup date";
  }
  const slots = getPickupTimeSlots(s);
  if (!slots.includes(pickupTime)) {
    return `Choose a pickup time between ${String(s.pickupStartHour).padStart(2, "0")}:00 and ${String(s.pickupEndHour).padStart(2, "0")}:00`;
  }

  const today = todayInAccra();
  const max = addDaysToDateString(today, s.maxAdvanceDays);
  if (pickupDate < today) {
    return "Pickup date cannot be in the past";
  }
  if (pickupDate > max) {
    return `Pickup date must be within the next ${s.maxAdvanceDays} days`;
  }

  if (pickupDate === today) {
    const now = accraParts();
    const nowMinutes = now.hour * 60 + now.minute;
    const [hours, minutes] = pickupTime.split(":").map(Number);
    const pickupMinutes = hours * 60 + minutes;
    const earliest = nowMinutes + s.minLeadHours * 60;
    if (pickupMinutes < earliest) {
      return `Pickup time must be at least ${s.minLeadHours} hours from now`;
    }
    if (now.hour >= s.sameDayCutoffHour) {
      return `Same-day orders are no longer available (cutoff: ${String(s.sameDayCutoffHour).padStart(2, "0")}:00)`;
    }
  }

  if (pickupDate === addDaysToDateString(today, 1)) {
    const now = accraParts();
    if (now.hour >= s.nextDayCutoffHour) {
      return `Next-day orders are no longer available (cutoff: ${String(s.nextDayCutoffHour).padStart(2, "0")}:00). Try a later date.`;
    }
  }

  return null;
}
