import { createServiceSupabase } from "@/lib/supabase";

export function db() {
  return createServiceSupabase();
}

export function throwIfError<T>(result: {
  data: T;
  error: { message: string } | null;
}): T {
  if (result.error) {
    throw new Error(result.error.message);
  }
  return result.data;
}

export function must<T>(value: T | null | undefined, message: string): T {
  if (value == null) {
    throw new Error(message);
  }
  return value;
}

export const ORDER_SELECT =
  "*, customer:customers(*), items:order_items(*, dish:dishes(*)), payment:payments(*)";
