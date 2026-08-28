import { createHash, createHmac, randomInt, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db, throwIfError } from "@/lib/db";

export const CUSTOMER_SESSION_COOKIE = "customer_phone_session";
const OTP_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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

function signSession(phone: string, expiresAt: number) {
  const payload = `${phone}.${expiresAt}`;
  const signature = createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

function verifySessionToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [phone, expiresRaw, signature] = parts;
  if (!phone || !expiresRaw || !signature) return null;
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;

  const expected = createHmac("sha256", sessionSecret())
    .update(`${phone}.${expiresAt}`)
    .digest("base64url");

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return { phone, expiresAt };
}

export function generateOtpCode() {
  return String(randomInt(100000, 1000000));
}

export async function storeOtp(phone: string, code: string) {
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
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

export async function verifyOtp(phone: string, code: string) {
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

export function createCustomerSessionValue(phone: string) {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  return signSession(phone, expiresAt);
}

export function parseCustomerSessionValue(token: string | undefined) {
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getVerifiedCustomerPhone() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;
  const session = parseCustomerSessionValue(token);
  return session?.phone ?? null;
}

export function customerSessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
