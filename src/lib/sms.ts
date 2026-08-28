import axios from "axios";
import { getPave360Config, pave360Headers } from "@/lib/pave360";
import { toE164Ghana } from "@/lib/phone";

export async function sendSms(to: string, message: string) {
  const config = getPave360Config();

  if (!config) {
    console.warn("SMS skipped: Pave360 env vars are not set");
    return { skipped: true as const };
  }

  const response = await axios.post(
    `${config.apiUrl}/api/external/sms/send`,
    {
      phone_number: toE164Ghana(to),
      message,
      sender_id: config.senderId,
      name: "Order alert",
    },
    {
      headers: pave360Headers(config.apiKey),
      timeout: 15000,
    },
  );

  return response.data;
}
