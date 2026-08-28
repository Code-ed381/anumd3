import { createHmac, timingSafeEqual } from "crypto";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error("PAYSTACK_SECRET_KEY is not set");
  }
  return key;
}

async function paystackFetch<T>(path: string, options: RequestInit = {}) {
  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const json = (await res.json()) as {
    status: boolean;
    message: string;
    data: T;
  };

  if (!json.status) {
    throw new Error(json.message || "Paystack API error");
  }

  return json.data;
}

export type InitializeTransactionResult = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

export async function initializeTransaction(params: {
  email: string;
  amount: number;
  callbackUrl: string;
  reference?: string;
  metadata?: Record<string, unknown>;
}) {
  return paystackFetch<InitializeTransactionResult>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      amount: params.amount,
      currency: "GHS",
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata ?? {},
    }),
  });
}

export type VerifyTransactionResult = {
  id: number;
  status: string;
  reference: string;
  amount: number;
  channel: string;
  paid_at: string | null;
  currency: string;
  metadata: Record<string, unknown>;
};

export async function verifyTransaction(reference: string) {
  return paystackFetch<VerifyTransactionResult>(
    `/transaction/verify/${reference}`,
  );
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
) {
  if (!signature) return false;
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) return false;

  const hash = createHmac("sha512", key).update(rawBody).digest("hex");
  const hashBuffer = Buffer.from(hash);
  const signatureBuffer = Buffer.from(signature);
  if (hashBuffer.length !== signatureBuffer.length) return false;
  return timingSafeEqual(hashBuffer, signatureBuffer);
}

export function ghsToPesewas(ghs: number) {
  return Math.round(ghs * 100);
}
