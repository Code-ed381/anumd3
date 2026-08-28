import { NextResponse } from "next/server";
import {
  createCustomerSessionValue,
  customerSessionCookieOptions,
  CUSTOMER_SESSION_COOKIE,
  verifyOtp,
} from "@/lib/customer-session";
import { normalizeGhanaPhone } from "@/lib/phone";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

export async function POST(request: Request) {
  if (!rateLimit(`otp-verify:${clientKey(request)}`, 12, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many attempts. Wait a few minutes." },
      { status: 429 },
    );
  }

  const body = (await request.json()) as { phone?: string; code?: string };
  const phone = normalizeGhanaPhone(body.phone || "");
  const code = String(body.code || "").trim();

  if (!phone) {
    return NextResponse.json(
      { error: "Enter a valid Ghana phone number" },
      { status: 400 },
    );
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "Enter the 6-digit code from your SMS" },
      { status: 400 },
    );
  }

  const valid = await verifyOtp(phone, code);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid or expired code. Request a new one." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    CUSTOMER_SESSION_COOKIE,
    createCustomerSessionValue(phone),
    customerSessionCookieOptions(SESSION_MAX_AGE),
  );
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CUSTOMER_SESSION_COOKIE, "", {
    ...customerSessionCookieOptions(0),
    maxAge: 0,
  });
  return response;
}
