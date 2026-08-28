import axios from "axios";
import { toE164Ghana } from "@/lib/phone";

export async function sendSms(to: string, message: string) {
  const apiUrl = process.env.PAVE360_API_URL;
  const apiKey = process.env.PAVE360_API_KEY;
  const senderId = process.env.PAVE360_SENDER_ID;

  if (!apiUrl || !apiKey || !senderId) {
    console.warn("SMS skipped: Pave360 env vars are not set");
    return { skipped: true as const };
  }

  const response = await axios.post(
    `${apiUrl.replace(/\/$/, "")}/api/external/sms/send`,
    {
      phone_number: toE164Ghana(to),
      message,
      sender_id: senderId,
      name: "Order alert",
    },
    {
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    },
  );

  return response.data;
}
