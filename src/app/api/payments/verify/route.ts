import { NextResponse } from "next/server";
import { getOrderByPaymentReference, serializeOrder } from "@/lib/order";
import { markOrderPaidFromCharge } from "@/lib/payment-success";
import { verifyTransaction } from "@/lib/paystack";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get("reference");
  if (!reference) {
    return NextResponse.json({ error: "reference is required" }, { status: 400 });
  }

  let order = await getOrderByPaymentReference(reference);

  try {
    const verified = await verifyTransaction(reference);
    if (verified.status === "success") {
      await markOrderPaidFromCharge(
        {
          reference: verified.reference,
          channel: verified.channel,
          paid_at: verified.paid_at,
        },
        verified,
      );
      order = await getOrderByPaymentReference(reference);
    }
  } catch (error) {
    console.error("Paystack verify failed", error);
  }

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ order: serializeOrder(order) });
}
