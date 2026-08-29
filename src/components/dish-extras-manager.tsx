"use client";

import { useEffect, useState } from "react";
import { formatGhs } from "@/lib/money";

type Extra = {
  id: string;
  name: string;
  price: number;
};

type DishExtrasManagerProps = {
  dishId: string | null;
  isGlobal?: boolean;
};

export function DishExtrasManager({
  dishId,
  isGlobal = false,
}: DishExtrasManagerProps) {
  const [extras, setExtras] = useState<Extra[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const url = isGlobal
      ? "/api/dish-extras"
      : `/api/dish-extras?dishId=${dishId}`;
    fetch(url)
      .then((r) => r.json())
      .then((json: { extras?: Extra[] }) => {
        if (!cancelled && json.extras) setExtras(json.extras);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [dishId, isGlobal]);

  async function addExtra(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/dish-extras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dishId: isGlobal ? null : dishId,
          name: name.trim(),
          price: Number(price) || 0,
        }),
      });
      const json = (await res.json()) as { error?: string; extra?: Extra };
      if (!res.ok) throw new Error(json.error || "Could not add extra");
      setExtras((prev) => [...prev, json.extra!]);
      setName("");
      setPrice("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add extra");
    } finally {
      setLoading(false);
    }
  }

  async function removeExtra(id: string) {
    const res = await fetch(`/api/dish-extras/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setExtras((prev) => prev.filter((e) => e.id !== id));
  }

  async function toggleAvailable(id: string, isAvailable: boolean) {
    await fetch(`/api/dish-extras/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_available: !isAvailable }),
    });
    const url = isGlobal
      ? "/api/dish-extras"
      : `/api/dish-extras?dishId=${dishId}`;
    const res = await fetch(url);
    const json = (await res.json()) as { extras?: Extra[] };
    if (json.extras) setExtras(json.extras);
  }

  return (
    <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
      <p className="text-sm font-medium">
        {isGlobal ? "Global extras" : "Dish extras"}
      </p>
      <p className="text-xs text-stone-500">
        {isGlobal
          ? "Available for all dishes"
          : "Available only for this dish"}
      </p>

      {extras.length > 0 && (
        <ul className="mt-2 space-y-1">
          {extras.map((extra) => (
            <li
              key={extra.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span>
                {extra.name}
                {extra.price > 0 && (
                  <span className="ml-1 text-stone-500">
                    (+{formatGhs(extra.price)})
                  </span>
                )}
                {extra.price === 0 && (
                  <span className="ml-1 text-emerald-600">Free</span>
                )}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void toggleAvailable(extra.id, true)}
                  className="text-xs text-stone-500"
                >
                  Hide
                </button>
                <button
                  type="button"
                  onClick={() => void removeExtra(extra.id)}
                  className="text-xs text-red-600"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(e) => void addExtra(e)}
        className="mt-2 flex gap-2"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Extra name"
          className="min-w-0 flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
        />
        <input
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Price"
          className="w-20 rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="shrink-0 rounded-lg bg-[color:var(--accent)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "…" : "Add"}
        </button>
      </form>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
