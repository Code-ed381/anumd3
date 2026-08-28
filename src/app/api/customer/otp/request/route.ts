import { NextResponse } from "next/server";
import { sendPhoneOtp } from "@/lib/otp";
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

  try {
    const result = await sendPhoneOtp(phone);

    const payload: { ok: true; message: string; devCode?: string } = {
      ok: true,
      message:
        result.provider === "pave360"
          ? "We sent a verification code to your phone."
          : "SMS is not configured. Check server logs for the code in development.",
    };

    if (result.provider === "local" && result.devCode) {
      payload.devCode = result.devCode;
    }

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not send verification code";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
