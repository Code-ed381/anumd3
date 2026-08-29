"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { PickupSettings } from "@/lib/pickup";
import { DEFAULT_SETTINGS } from "@/lib/pickup";

const FIELDS: {
  key: keyof PickupSettings;
  label: string;
  description: string;
  min: number;
  max: number;
}[] = [
  {
    key: "pickupStartHour",
    label: "Pickup start time",
    description: "Earliest hour customers can pick up",
    min: 6,
    max: 20,
  },
  {
    key: "pickupEndHour",
    label: "Pickup end time",
    description: "Latest hour customers can pick up",
    min: 10,
    max: 23,
  },
  {
    key: "minLeadHours",
    label: "Minimum lead time (hours)",
    description: "How far in advance customers must order",
    min: 1,
    max: 12,
  },
  {
    key: "sameDayCutoffHour",
    label: "Same-day cutoff time",
    description: "No same-day orders after this hour",
    min: 10,
    max: 22,
  },
  {
    key: "nextDayCutoffHour",
    label: "Next-day cutoff time",
    description: "No next-day orders after this hour",
    min: 10,
    max: 23,
  },
  {
    key: "maxAdvanceDays",
    label: "Max advance days",
    description: "How far ahead customers can order",
    min: 1,
    max: 30,
  },
];

export default function OwnerSettingsPage() {
  const [settings, setSettings] = useState<PickupSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/owner/settings")
      .then((r) => r.json())
      .then((json: { settings?: PickupSettings }) => {
        if (!cancelled && json.settings) {
          setSettings(json.settings);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/owner/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const json = (await res.json()) as {
        error?: string;
        settings?: PickupSettings;
      };
      if (!res.ok) throw new Error(json.error || "Could not save");
      if (json.settings) setSettings(json.settings);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  function updateField(key: keyof PickupSettings, value: string) {
    const num = Number(value);
    if (!Number.isFinite(num)) return;
    setSettings((prev) => ({ ...prev, [key]: num }));
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
        <p className="text-stone-500">Loading settings…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
      <h2 className="text-2xl font-semibold">Pickup settings</h2>
      <p className="mt-1 text-sm text-stone-600">
        Configure delivery windows, lead times, and order cutoffs for
        customers.
      </p>

      <div className="mt-6 space-y-5">
        {FIELDS.map((field) => (
          <label key={field.key} className="block">
            <span className="text-sm font-medium">{field.label}</span>
            <span className="mt-0.5 block text-xs text-stone-500">
              {field.description}
            </span>
            <input
              type="number"
              min={field.min}
              max={field.max}
              value={settings[field.key]}
              onChange={(e) => updateField(field.key, e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
            />
          </label>
        ))}
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="mt-6 w-full rounded-full bg-[color:var(--accent)] py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save settings"}
      </button>
    </main>
  );
}
