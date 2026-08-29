"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function PushEnableButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "on" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) setStatus("on");
      });
    });
  }, []);

  async function enable() {
    setStatus("loading");
    setMessage("");
    try {
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key || key === "xxxxx") {
        throw new Error("Push is not configured yet (missing VAPID public key).");
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("This browser does not support push notifications.");
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Notifications were blocked.");
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "Could not save subscription");
      }
      setStatus("on");
      setMessage("Push alerts are on for this device.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not enable push");
    }
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <p className="text-sm font-medium">Instant alerts</p>
      <p className="mt-1 text-sm text-stone-500">
        Enable push on this phone so new paid orders pop up immediately. SMS is
        sent separately.
      </p>
      <button
        type="button"
        onClick={() => void enable()}
        disabled={status === "loading" || status === "on"}
        className="mt-3 rounded-full bg-[color:var(--brand-green-dark)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {status === "on"
          ? "Push enabled"
          : status === "loading"
            ? "Enabling…"
            : "Enable push notifications"}
      </button>
      {message && (
        <p
          className={`mt-2 text-sm ${status === "error" ? "text-red-700" : "text-emerald-700"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
