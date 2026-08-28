import axios from "axios";
import { createHash, randomInt, timingSafeEqual } from "crypto";
import { db, throwIfError } from "@/lib/db";
import {
  getPave360Config,
  otpMessageTemplate,
  pave360Headers,
} from "@/lib/pave360";
import { toE164Ghana } from "@/lib/phone";

const OTP_EXPIRY_MINUTES = 10;
export const OTP_LENGTH = 6;
const OTP_TYPE = "NUMERIC";

function sessionSecret() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return secret;
}

function hashOtp(phone: string, code: string) {
  return createHash("sha256")
    .update(`${phone}:${code}:${sessionSecret()}`)
    .digest("hex");
}

function generateLocalOtpCode() {
  return String(randomInt(10 ** (OTP_LENGTH - 1), 10 ** OTP_LENGTH));
}

async function storeLocalOtp(phone: string, code: string) {
  const expiresAt = new Date(
    Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000,
  ).toISOString();
  const { error } = await db().from("phone_otp_codes").upsert(
    {
      phone,
      code_hash: hashOtp(phone, code),
      expires_at: expiresAt,
    },
    { onConflict: "phone" },
  );
  if (error) throw new Error(error.message);
}

async function verifyLocalOtp(phone: string, code: string) {
  const row = throwIfError(
    await db()
      .from("phone_otp_codes")
      .select("code_hash, expires_at")
      .eq("phone", phone)
      .maybeSingle(),
  ) as { code_hash: string; expires_at: string } | null;

  if (!row) return false;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await db().from("phone_otp_codes").delete().eq("phone", phone);
    return false;
  }

  const hash = hashOtp(phone, code);
  const valid =
    row.code_hash.length === hash.length &&
    timingSafeEqual(Buffer.from(row.code_hash), Buffer.from(hash));

  if (valid) {
    await db().from("phone_otp_codes").delete().eq("phone", phone);
  }
  return valid;
}

export type SendOtpResult =
  | { ok: true; provider: "pave360" }
  | { ok: true; provider: "local"; devCode?: string };

export async function sendPhoneOtp(phone: string): Promise<SendOtpResult> {
  const config = getPave360Config();

  if (config) {
    await axios.post(
      `${config.apiUrl}/api/external/otp/send`,
      {
        phone_number: toE164Ghana(phone),
        expiry: OTP_EXPIRY_MINUTES,
        length: OTP_LENGTH,
        type: OTP_TYPE,
        message: otpMessageTemplate(),
        sender_id: config.senderId,
      },
      {
        headers: pave360Headers(config.apiKey),
        timeout: 15000,
      },
    );
    return { ok: true, provider: "pave360" };
  }

  const code = generateLocalOtpCode();
  await storeLocalOtp(phone, code);
  console.warn(`OTP for ${phone}: ${code} (Pave360 OTP not configured)`);

  return {
    ok: true,
    provider: "local",
    ...(process.env.NODE_ENV === "development" ? { devCode: code } : {}),
  };
}

export async function verifyPhoneOtp(phone: string, code: string) {
  const config = getPave360Config();

  if (config) {
    try {
      const response = await axios.post(
        `${config.apiUrl}/api/external/otp/verify`,
        {
          phone_number: toE164Ghana(phone),
          otp_code: code,
        },
        {
          headers: pave360Headers(config.apiKey),
          timeout: 15000,
        },
      );
      const data = response.data as { success?: boolean; verified?: boolean };
      return (
        data.success === true ||
        data.verified === true ||
        response.status === 200
      );
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        return false;
      }
      throw error;
    }
  }

  return verifyLocalOtp(phone, code);
}

export function isValidOtpCode(code: string) {
  return new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code);
}
