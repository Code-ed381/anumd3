import { getAppUrl, getBusinessName } from "@/lib/config";
import { formatGhs } from "@/lib/money";
import { getOrderById, itemSummary, type OrderWithDetails } from "@/lib/order";
import { formatScheduleDate } from "@/lib/schedule";
import { utcDateToDateString } from "@/lib/pickup";
import { sendSms } from "@/lib/sms";

function pickupLabel(order: OrderWithDetails) {
  const date = utcDateToDateString(order.pickup_date);
  return `${formatScheduleDate(date)} at ${order.pickup_time}`;
}

function orderUrl(orderId: string) {
  return `${getAppUrl()}/order/${orderId}`;
}

function historyUrl() {
  return `${getAppUrl()}/my-orders`;
}

export async function notifyCustomerOrderPlaced(orderId: string) {
  try {
    const order = await getOrderById(orderId);
    if (!order) return;

    const business = getBusinessName();
    const message = `Hi ${order.customer.name}! Your ${business} pre-order (${itemSummary(order)}) for pickup ${pickupLabel(order)} is ready. Pay here: ${orderUrl(order.id)} View orders anytime: ${historyUrl()}`;

    const result = await sendSms(order.customer.phone, message);
    if ("skipped" in result) {
      console.warn("Customer order SMS skipped (Pave360 not configured)", {
        orderId,
      });
    }
  } catch (error) {
    console.error("Customer order SMS failed", error);
  }
}

export async function notifyCustomerOrderPaid(orderId: string) {
  try {
    const order = await getOrderById(orderId);
    if (!order) return;

    const business = getBusinessName();
    const message = `Payment received for your ${business} order (${formatGhs(order.total_amount)}). Pickup ${pickupLabel(order)}. Track your order: ${orderUrl(order.id)}`;

    const result = await sendSms(order.customer.phone, message);
    if ("skipped" in result) {
      console.warn("Customer paid SMS skipped (Pave360 not configured)", {
        orderId,
      });
    }
  } catch (error) {
    console.error("Customer paid SMS failed", error);
  }
}

export async function sendCustomerOtpSms(phone: string, code: string) {
  const business = getBusinessName();
  const message = `Your ${business} verification code is ${code}. It expires in 10 minutes.`;
  return sendSms(phone, message);
}
