import { NextResponse } from "next/server";
import { getVerifiedCustomerPhone } from "@/lib/customer-session";
import { displayGhanaPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

export async function GET() {
  const phone = await getVerifiedCustomerPhone();
  if (!phone) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  return NextResponse.json({
    phone: displayGhanaPhone(phone),
    normalizedPhone: phone,
  });
}
