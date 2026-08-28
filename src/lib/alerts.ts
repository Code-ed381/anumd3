import { formatGhs } from "@/lib/money";
import { db, throwIfError } from "@/lib/db";
import {
  getOrderById,
  itemSummary,
  type OrderWithDetails,
} from "@/lib/order";
import { utcDateToDateString } from "@/lib/pickup";
import { sendPush } from "@/lib/push";
import { sendSms } from "@/lib/sms";
import type { OwnerRow } from "@/lib/types";

function alertMessage(order: OrderWithDetails) {
  return `New order! ${order.customer.name} ordered ${itemSummary(order)} for pickup ${utcDateToDateString(order.pickup_date)} ${order.pickup_time}. Total: ${formatGhs(order.total_amount)}. Check dashboard.`;
}

export async function notifyOwnerOfPaidOrder(orderId: string) {
  try {
    const order = await getOrderById(orderId);
    if (!order) return;

    const owners = throwIfError(
      await db()
        .from("owners")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1),
    ) as OwnerRow[];
    const owner = owners[0];
    if (!owner) {
      console.warn("Owner alerts skipped: no Owner row");
      return;
    }

    const message = alertMessage(order);

    try {
      await sendSms(owner.phone, message);
    } catch (error) {
      console.error("SMS alert failed", error);
    }

    try {
      await sendPush(owner.id, {
        title: "New paid order",
        body: message,
        url: "/owner/dashboard",
      });
    } catch (error) {
      console.error("Push alert failed", error);
    }
  } catch (error) {
    console.error("Owner alert failed", error);
  }
}
