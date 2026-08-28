import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const CUSTOMER_SESSION_COOKIE = "customer_phone_session";
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

function sessionSecret() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return secret;
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
