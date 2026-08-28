import { notifyOwnerOfPaidOrder } from "@/lib/alerts";
import { notifyCustomerOrderPaid } from "@/lib/customer-alerts";
import { db } from "@/lib/db";
import { OrderStatus, type PaymentRow } from "@/lib/types";

type ChargeData = {
  reference?: string;
  channel?: string;
  paid_at?: string | null;
};

export async function markOrderPaidFromCharge(
  data: ChargeData,
  raw: unknown,
) {
  const reference = data.reference;
  if (!reference) {
    throw new Error("Missing payment reference");
  }

  const paidAt = data.paid_at ? new Date(data.paid_at).toISOString() : new Date().toISOString();

  const { data: payment, error: paymentError } = await db()
    .from("payments")
    .select("*, order:orders(*)")
    .eq("reference", reference)
    .maybeSingle<PaymentRow & { order: { id: string; status: string } | { id: string; status: string }[] | null }>();

  if (paymentError) throw new Error(paymentError.message);
  if (!payment) throw new Error("Payment not found");

  const order = Array.isArray(payment.order) ? payment.order[0] : payment.order;
  if (!order) throw new Error("Payment order not found");

  const { data: claimed, error: claimError } = await db()
    .from("payments")
    .update({
      status: "success",
      channel: data.channel ?? payment.channel,
      paid_at: paidAt,
      raw_webhook_data: raw,
    })
    .eq("id", payment.id)
    .eq("status", "pending")
    .select("id");

  if (claimError) throw new Error(claimError.message);

  if (order.status === OrderStatus.PENDING) {
    const { error: orderError } = await db()
      .from("orders")
      .update({ status: OrderStatus.PAID })
      .eq("id", payment.order_id);
    if (orderError) throw new Error(orderError.message);
  }

  const alreadyPaid = !claimed || claimed.length === 0;
  if (!alreadyPaid) {
    await notifyOwnerOfPaidOrder(payment.order_id);
    await notifyCustomerOrderPaid(payment.order_id);
  }

  return { orderId: payment.order_id, alreadyPaid };
}

export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.CANCELLED],
  PAID: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.READY, OrderStatus.CANCELLED],
  READY: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  COMPLETED: [],
  CANCELLED: [],
};
