import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { db, must, throwIfError } from "@/lib/db";
import { serializeDish } from "@/lib/order";
import { parseServeWeekdaysFromForm, validateServeWeekdays } from "@/lib/schedule";
import { uploadDishPhoto } from "@/lib/storage";
import type { DishRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "1";

  if (all) {
    const auth = await requireOwner();
    if (auth.error) return auth.error;
  }

  let query = db().from("dishes").select("*").order("created_at", {
    ascending: false,
  });
  if (!all) {
    query = query.eq("is_available", true);
  }

  const dishes = throwIfError(await query) as DishRow[];
  return NextResponse.json({ dishes: dishes.map(serializeDish) });
}

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const form = await request.formData();
  const name = String(form.get("name") || "").trim();
  const description = String(form.get("description") || "").trim();
  const priceRaw = String(form.get("price") || "").trim();
  const isAvailable = String(form.get("isAvailable") || "true") !== "false";
  const serveWeekdays = parseServeWeekdaysFromForm(form.get("serveWeekdays"));
  const photo = form.get("photo");

  const price = Number(priceRaw);
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: "Price must be greater than 0" }, { status: 400 });
  }
  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json({ error: "A dish photo is required" }, { status: 400 });
  }

  let photoUrl: string;
  try {
    photoUrl = await uploadDishPhoto(photo);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Photo upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const dish = must(
    throwIfError(
      await db()
        .from("dishes")
        .insert({
          name,
          description: description || null,
          price,
          photo_url: photoUrl,
          is_available: isAvailable,
          serve_weekdays: serveWeekdays,
        })
        .select()
        .single(),
    ) as DishRow | null,
    "Could not create dish",
  );

  return NextResponse.json({ dish: serializeDish(dish) }, { status: 201 });
}
