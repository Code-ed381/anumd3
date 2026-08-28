import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { markOrderPaidFromCharge } from "@/lib/payment-success";
import { verifyWebhookSignature } from "@/lib/paystack";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as {
    event?: string;
    data?: {
      reference?: string;
      channel?: string;
      paid_at?: string | null;
      status?: string;
    };
  };

  if (event.event === "charge.success" && event.data) {
    try {
      await markOrderPaidFromCharge(event.data, event);
    } catch (error) {
      console.error("Paystack webhook processing failed", error);
      return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
  }

  if (event.event === "charge.failed" && event.data?.reference) {
    try {
      const { error } = await db()
        .from("payments")
        .update({ status: "failed", raw_webhook_data: event })
        .eq("reference", event.data.reference)
        .eq("status", "pending");
      if (error) throw error;
    } catch (error) {
      console.error("Failed to mark payment as failed", error);
    }
  }

  return NextResponse.json({ received: true });
}
