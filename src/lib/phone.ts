const LOCAL_10 = /^0\d{9}$/;
const INTL_12 = /^233\d{9}$/;
const PLUS_INTL = /^\+233\d{9}$/;

export function normalizeGhanaPhone(input: string): string | null {
  const trimmed = input.replace(/[\s-]/g, "");
  if (PLUS_INTL.test(trimmed)) {
    return trimmed.slice(1);
  }
  if (INTL_12.test(trimmed)) {
    return trimmed;
  }
  if (LOCAL_10.test(trimmed)) {
    return `233${trimmed.slice(1)}`;
  }
  return null;
}

export function displayGhanaPhone(phone233: string) {
  if (phone233.startsWith("233") && phone233.length === 12) {
    return `0${phone233.slice(3)}`;
  }
  return phone233;
}

export function toE164Ghana(phone233: string) {
  return phone233.startsWith("+") ? phone233 : `+${phone233}`;
}

export function placeholderEmailFromPhone(phone233: string) {
  return `${phone233}@customer.example.com`;
}
