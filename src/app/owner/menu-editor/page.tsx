"use client";

import { useEffect, useState, type FormEvent } from "react";
import { formatGhs } from "@/lib/money";
import { formatWeekdaySummary, WEEKDAY_OPTIONS } from "@/lib/schedule";

type Dish = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  photoUrl: string | null;
  isAvailable: boolean;
  serveWeekdays: number[];
};

const emptyForm = {
  name: "",
  description: "",
  price: "",
  isAvailable: true,
  serveWeekdays: [] as number[],
};

export default function MenuEditorPage() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [photo, setPhoto] = useState<File | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const photoRequired = !editingId || !existingPhotoUrl;
  const hasPhoto = Boolean(existingPhotoUrl || photo);

  async function load() {
    const res = await fetch("/api/dishes?all=1");
    const json = (await res.json()) as { dishes?: Dish[]; error?: string };
    if (!res.ok) {
      setError(json.error || "Could not load dishes");
      return;
    }
    setDishes(json.dishes || []);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dishes?all=1")
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }: { ok: boolean; json: { dishes?: Dish[]; error?: string } }) => {
        if (cancelled) return;
        if (!ok) {
          setError(json.error || "Could not load dishes");
          return;
        }
        setDishes(json.dishes || []);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load dishes");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleWeekday(day: number) {
    setForm((current) => {
      const hasDay = current.serveWeekdays.includes(day);
      return {
        ...current,
        serveWeekdays: hasDay
          ? current.serveWeekdays.filter((value) => value !== day)
          : [...current.serveWeekdays, day].sort((a, b) => a - b),
      };
    });
  }

  function startEdit(dish: Dish) {
    setEditingId(dish.id);
    setExistingPhotoUrl(dish.photoUrl);
    setForm({
      name: dish.name,
      description: dish.description || "",
      price: String(dish.price),
      isAvailable: dish.isAvailable,
      serveWeekdays: dish.serveWeekdays ?? [],
    });
    setPhoto(null);
    setError("");
  }

  function resetForm() {
    setEditingId(null);
    setExistingPhotoUrl(null);
    setForm(emptyForm);
    setPhoto(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (photoRequired && !photo) {
      setError("Add a photo for this dish");
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.set("name", form.name);
      data.set("description", form.description);
      data.set("price", form.price);
      data.set("isAvailable", String(form.isAvailable));
      data.set("serveWeekdays", JSON.stringify(form.serveWeekdays));
      if (photo) data.set("photo", photo);

      const url = editingId ? `/api/dishes/${editingId}` : "/api/dishes";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        body: data,
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "Could not save dish");
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save dish");
    } finally {
      setLoading(false);
    }
  }

  async function toggleAvailable(dish: Dish) {
    if (!dish.isAvailable && !dish.photoUrl) {
      setError("Add a photo before making this dish available");
      return;
    }
    const res = await fetch(`/api/dishes/${dish.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !dish.isAvailable }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(json.error || "Could not update availability");
      return;
    }
    setError("");
    await load();
  }

  async function remove(dish: Dish) {
    if (!confirm(`Delete ${dish.name}?`)) return;
    const res = await fetch(`/api/dishes/${dish.id}`, { method: "DELETE" });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(json.error || "Could not delete");
      return;
    }
    await load();
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Menu</h1>
      <p className="mt-1 text-sm text-stone-600">
        Add dishes and choose which days each meal is served. Every dish needs a
        photo. Unavailable items are hidden from customers.
      </p>

      <form
        onSubmit={(event) => void save(event)}
        className="mt-6 space-y-3 rounded-2xl border border-stone-200 bg-white p-4"
      >
        <h2 className="font-medium">{editingId ? "Edit dish" : "Add a dish"}</h2>

        {photoRequired && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {editingId
              ? "This dish needs a photo before it can go on the menu."
              : "Upload a photo of this meal."}
          </p>
        )}

        <input
          required
          placeholder="Name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          className="w-full rounded-xl border border-stone-300 px-3 py-3"
        />
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(event) =>
            setForm({ ...form, description: event.target.value })
          }
          className="w-full rounded-xl border border-stone-300 px-3 py-3"
          rows={3}
        />
        <input
          required
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Price (GHS)"
          value={form.price}
          onChange={(event) => setForm({ ...form, price: event.target.value })}
          className="w-full rounded-xl border border-stone-300 px-3 py-3"
        />
        <fieldset>
          <legend className="text-sm font-medium">Served on</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {WEEKDAY_OPTIONS.map((day) => {
              const active = form.serveWeekdays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleWeekday(day.value)}
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    active
                      ? "bg-[color:var(--brand-green-dark)] text-white"
                      : "bg-[color:var(--brand-green)]/10 text-[color:var(--brand-green-dark)]"
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </fieldset>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isAvailable}
            onChange={(event) =>
              setForm({ ...form, isAvailable: event.target.checked })
            }
            disabled={!hasPhoto}
          />
          Available on the menu
        </label>
        {existingPhotoUrl && (
          <div className="overflow-hidden rounded-xl border border-stone-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={existingPhotoUrl}
              alt="Current dish photo"
              className="aspect-[16/10] w-full object-cover"
            />
          </div>
        )}
        <label className="block text-sm">
          <span className="font-medium">
            Photo {photoRequired ? "(required)" : "(optional)"}
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required={photoRequired}
            onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
            className="mt-1 w-full text-sm"
          />
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "Saving…" : editingId ? "Save changes" : "Add dish"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full px-4 py-2 text-sm text-stone-600"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <ul className="mt-6 space-y-3">
        {dishes.length === 0 && (
          <li className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-center text-stone-500">
            No dishes yet.
          </li>
        )}
        {dishes.map((dish) => (
          <li
            key={dish.id}
            className="flex gap-3 rounded-2xl border border-stone-200 bg-white p-3"
          >
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-stone-100">
              {dish.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={dish.photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-stone-400">
                  No photo
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{dish.name}</p>
                <p className="text-sm">{formatGhs(dish.price)}</p>
              </div>
              {dish.description && (
                <p className="text-sm text-stone-500">{dish.description}</p>
              )}
              <p className="mt-1 text-xs text-stone-500">
                {dish.isAvailable ? "Available" : "Hidden"}
                {!dish.photoUrl ? " · Needs photo" : ""}
                {dish.serveWeekdays?.length
                  ? ` · ${formatWeekdaySummary(dish.serveWeekdays)}`
                  : " · No days set"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                <button type="button" onClick={() => startEdit(dish)}>
                  Edit
                </button>
                {dish.isAvailable ? (
                  <button type="button" onClick={() => void toggleAvailable(dish)}>
                    Hide
                  </button>
                ) : dish.photoUrl ? (
                  <button type="button" onClick={() => void toggleAvailable(dish)}>
                    Show
                  </button>
                ) : (
                  <span className="text-stone-400">Add photo to show</span>
                )}
                <button
                  type="button"
                  className="text-red-700"
                  onClick={() => void remove(dish)}
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
