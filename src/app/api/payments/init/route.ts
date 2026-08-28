import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/config";
import { db, throwIfError } from "@/lib/db";
import { getOrderById } from "@/lib/order";
import { moneyToNumber } from "@/lib/money";
import { ghsToPesewas, initializeTransaction } from "@/lib/paystack";
import { placeholderEmailFromPhone } from "@/lib/phone";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!rateLimit(`pay:${clientKey(request)}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many payment attempts. Please wait." },
      { status: 429 },
    );
  }

  const body = (await request.json()) as { orderId?: string };
  if (!body.orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  try {
    const order = await getOrderById(body.orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.status !== OrderStatus.PENDING) {
      return NextResponse.json(
        { error: "This order is not awaiting payment" },
        { status: 400 },
      );
    }

    const amountGhs = moneyToNumber(order.total_amount);
    const email =
      order.customer.email || placeholderEmailFromPhone(order.customer.phone);
    const reference = `ord_${order.id.replace(/-/g, "").slice(0, 18)}_${Date.now()}`;
    const callbackUrl = `${getAppUrl()}/order-status/${reference}`;

    const init = await initializeTransaction({
      email,
      amount: ghsToPesewas(amountGhs),
      callbackUrl,
      reference,
      metadata: { orderId: order.id },
    });

    throwIfError(
      await db()
        .from("payments")
        .upsert(
          {
            order_id: order.id,
            reference: init.reference,
            amount: amountGhs,
            status: "pending",
          },
          { onConflict: "order_id" },
        )
        .select("id")
        .single(),
    );

    return NextResponse.json({
      authorizationUrl: init.authorization_url,
      reference: init.reference,
    });
  } catch (error) {
    console.error("Payment init failed:", error);
    const message =
      error instanceof Error ? error.message : "Could not initialize payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
