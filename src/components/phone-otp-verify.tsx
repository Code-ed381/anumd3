"use client";

import { useState } from "react";
import { toast } from "sonner";
import { normalizeGhanaPhone } from "@/lib/phone";

type PhoneOtpVerifyProps = {
  phone: string;
  verified: boolean;
  onVerified: () => void;
  compact?: boolean;
};

export function PhoneOtpVerify({
  phone,
  verified,
  onVerified,
  compact = false,
}: PhoneOtpVerifyProps) {
  const [step, setStep] = useState<"idle" | "code">("idle");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const normalized = normalizeGhanaPhone(phone);

  async function sendCode() {

    if (!normalized) {
      toast.error("Enter a valid Ghana phone number first.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/customer/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const json = (await res.json()) as {
        error?: string;
        message?: string;
        devCode?: string;
      };
      if (!res.ok) {
        throw new Error(json.error || "Could not send code");
      }
      setStep("code");
      toast.success(
        json.devCode
          ? `${json.message || "Code sent."} Dev code: ${json.devCode}`
          : json.message || "We sent a verification code to your phone.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setLoading(false);
    }
  }

  async function confirmCode() {
    setLoading(true);
    try {
      const res = await fetch("/api/customer/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "Invalid code");
      }
      setStep("idle");
      setCode("");
      toast.success("Phone verified successfully!");
      onVerified();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  if (verified) {
    return (
      <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
        Phone number verified. You will not need to verify again to view your
        order history on this device.
      </p>
    );
  }

  if (step === "code") {
    return (
      <div className="space-y-3">
        <label className="block">
          <span className="text-sm font-medium">6-digit code</span>
          <input
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="123456"
            inputMode="numeric"
            maxLength={6}
            className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-3 tracking-widest"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading || !code}
            onClick={() => void confirmCode()}
            className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "Verifying…" : compact ? "Verify & continue" : "Verify code"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void sendCode()}
            className="rounded-full border border-stone-300 px-4 py-2 text-sm"
          >
            Resend code
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("idle");
              setCode("");
            }}
            className="text-sm text-stone-600"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-stone-600">
        {compact
          ? "Verify your phone once to place this order and access your order history later."
          : "Verify your phone to view order history."}
      </p>
      <button
        type="button"
        disabled={loading || !normalized}
        onClick={() => void sendCode()}
        className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {loading ? "Sending…" : "Send verification code"}
      </button>
    </div>
  );
}

export function phonesMatch(sessionPhone233: string, inputPhone: string) {
  const normalized = normalizeGhanaPhone(inputPhone);
  return Boolean(normalized && normalized === sessionPhone233);
}
