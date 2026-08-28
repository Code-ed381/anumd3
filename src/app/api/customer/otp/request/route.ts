import { NextResponse } from "next/server";
import { sendCustomerOtpSms } from "@/lib/customer-alerts";
import { generateOtpCode, storeOtp } from "@/lib/customer-session";
import { db } from "@/lib/db";
import { normalizeGhanaPhone } from "@/lib/phone";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { phone?: string };
  const phone = normalizeGhanaPhone(body.phone || "");

  if (!phone) {
    return NextResponse.json(
      { error: "Enter a valid Ghana phone number" },
      { status: 400 },
    );
  }

  if (!rateLimit(`otp:phone:${phone}`, 3, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many codes sent to this number. Try again in an hour." },
      { status: 429 },
    );
  }
  if (!rateLimit(`otp:ip:${clientKey(request)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 },
    );
  }

  const code = generateOtpCode();
  await storeOtp(phone, code);

  try {
    const smsResult = await sendCustomerOtpSms(phone, code);
    const skipped = "skipped" in smsResult;

    if (skipped) {
      console.warn(`OTP for ${phone}: ${code} (SMS not configured)`);
    }

    const payload: { ok: true; message: string; devCode?: string } = {
      ok: true,
      message: skipped
        ? "SMS is not configured. Check server logs for the code in development."
        : "We sent a verification code to your phone.",
    };

    if (skipped && process.env.NODE_ENV === "development") {
      payload.devCode = code;
    }

    return NextResponse.json(payload);
  } catch (error) {
    await db().from("phone_otp_codes").delete().eq("phone", phone);
    const message =
      error instanceof Error ? error.message : "Could not send SMS";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
