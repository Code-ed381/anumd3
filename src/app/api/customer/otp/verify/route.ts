import { NextResponse } from "next/server";
import {
  createCustomerSessionValue,
  customerSessionCookieOptions,
  CUSTOMER_SESSION_COOKIE,
} from "@/lib/customer-session";
import { isValidOtpCode, verifyPhoneOtp } from "@/lib/otp";
import { normalizeGhanaPhone } from "@/lib/phone";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const SESSION_MAX_AGE = 90 * 24 * 60 * 60;

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
  if (!isValidOtpCode(code)) {
    return NextResponse.json(
      { error: "Enter the 6-digit code from your SMS" },
      { status: 400 },
    );
  }

  try {
    const valid = await verifyPhoneOtp(phone, code);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid or expired code. Request a new one." },
        { status: 401 },
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not verify code";
    return NextResponse.json({ error: message }, { status: 502 });
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
