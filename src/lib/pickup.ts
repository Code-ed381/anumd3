const ACCRA = "Africa/Accra";

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

export function getPickupTimeSlots() {
  const slots: string[] = [];
  for (let hour = 10; hour <= 20; hour += 1) {
    slots.push(`${String(hour).padStart(2, "0")}:00`);
    if (hour < 20) {
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

export function validatePickup(pickupDate: string, pickupTime: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pickupDate)) {
    return "Choose a valid pickup date";
  }
  const slots = getPickupTimeSlots();
  if (!slots.includes(pickupTime)) {
    return "Choose a pickup time between 10:00 and 20:00";
  }

  const today = todayInAccra();
  const max = addDaysToDateString(today, 14);
  if (pickupDate < today) {
    return "Pickup date cannot be in the past";
  }
  if (pickupDate > max) {
    return "Pickup date must be within the next 14 days";
  }

  if (pickupDate === today) {
    const now = accraParts();
    const [hours, minutes] = pickupTime.split(":").map(Number);
    const pickupMinutes = hours * 60 + minutes;
    const earliest = now.hour * 60 + now.minute + 120;
    if (pickupMinutes < earliest) {
      return "Pickup time must be at least 2 hours from now";
    }
  }

  return null;
}
