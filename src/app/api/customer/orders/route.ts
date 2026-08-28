import { NextResponse } from "next/server";
import { getVerifiedCustomerPhone } from "@/lib/customer-session";
import { getOrdersByCustomerPhone } from "@/lib/order";
import { displayGhanaPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

export async function GET() {
  const phone = await getVerifiedCustomerPhone();
  if (!phone) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const orders = await getOrdersByCustomerPhone(phone);
    return NextResponse.json({
      phone: displayGhanaPhone(phone),
      orders,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load orders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
