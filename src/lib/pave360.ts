import { getBusinessName } from "@/lib/config";

export type Pave360Config = {
  apiUrl: string;
  apiKey: string;
  senderId: string;
};

export function getPave360Config(): Pave360Config | null {
  const apiUrl = process.env.PAVE360_API_URL;
  const apiKey = process.env.PAVE360_API_KEY;
  const senderId = process.env.PAVE360_SENDER_ID;

  if (!apiUrl || !apiKey || !senderId) {
    return null;
  }

  return {
    apiUrl: apiUrl.replace(/\/$/, ""),
    apiKey,
    senderId,
  };
}

export function pave360Headers(apiKey: string) {
  return {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
  };
}

export function otpMessageTemplate() {
  const business = getBusinessName();
  return `Your ${business} verification code is {{otp}}. It expires in 10 minutes.`;
}
