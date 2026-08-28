import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { db, must, throwIfError } from "@/lib/db";
import { serializeDish } from "@/lib/order";
import { validateServeWeekdays } from "@/lib/schedule";
import { uploadDishPhoto } from "@/lib/storage";
import type { DishRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const { id } = await ctx.params;
  const existing = throwIfError(
    await db().from("dishes").select("id, photo_url").eq("id", id).maybeSingle(),
  ) as { id: string; photo_url: string | null } | null;
  if (!existing) {
    return NextResponse.json({ error: "Dish not found" }, { status: 404 });
  }

  const contentType = request.headers.get("content-type") || "";
  let name: string | undefined;
  let description: string | null | undefined;
  let price: number | undefined;
  let isAvailable: boolean | undefined;
  let serveWeekdays: number[] | undefined;
  let photoUrl: string | null | undefined;

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    if (form.has("name")) name = String(form.get("name") || "").trim();
    if (form.has("description")) {
      const value = String(form.get("description") || "").trim();
      description = value || null;
    }
    if (form.has("price")) price = Number(form.get("price"));
    if (form.has("isAvailable")) {
      isAvailable = String(form.get("isAvailable")) !== "false";
    }
    if (form.has("serveWeekdays")) {
      const raw = String(form.get("serveWeekdays") || "").trim();
      if (raw) {
        const parsed = validateServeWeekdays(JSON.parse(raw) as unknown);
        if (!parsed.ok) {
          return NextResponse.json({ error: parsed.error }, { status: 400 });
        }
        serveWeekdays = parsed.value;
      } else {
        serveWeekdays = [];
      }
    }
    const photo = form.get("photo");
    if (photo instanceof File && photo.size > 0) {
      try {
        photoUrl = await uploadDishPhoto(photo);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Photo upload failed";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }
  } else {
    const body = (await request.json()) as {
      name?: string;
      description?: string | null;
      price?: number;
      isAvailable?: boolean;
      serveWeekdays?: number[];
    };
    name = body.name?.trim();
    description = body.description;
    price = body.price;
    isAvailable = body.isAvailable;
    if (body.serveWeekdays !== undefined) {
      const parsed = validateServeWeekdays(body.serveWeekdays);
      if (!parsed.ok) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      serveWeekdays = parsed.value;
    }
  }

  if (name !== undefined && !name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (price !== undefined && (!Number.isFinite(price) || price <= 0)) {
    return NextResponse.json(
      { error: "Price must be greater than 0" },
      { status: 400 },
    );
  }
  if (isAvailable === true && !existing.photo_url && !photoUrl) {
    return NextResponse.json(
      { error: "Add a photo before making this dish available" },
      { status: 400 },
    );
  }
  if (
    contentType.includes("multipart/form-data") &&
    !existing.photo_url &&
    !photoUrl
  ) {
    return NextResponse.json({ error: "A dish photo is required" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (name !== undefined) patch.name = name;
  if (description !== undefined) patch.description = description;
  if (price !== undefined) patch.price = price;
  if (isAvailable !== undefined) patch.is_available = isAvailable;
  if (serveWeekdays !== undefined) patch.serve_weekdays = serveWeekdays;
  if (photoUrl !== undefined) patch.photo_url = photoUrl;

  const dish = must(
    throwIfError(
      await db().from("dishes").update(patch).eq("id", id).select().single(),
    ) as DishRow | null,
    "Could not update dish",
  );

  return NextResponse.json({ dish: serializeDish(dish) });
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const { id } = await ctx.params;
  const existing = throwIfError(
    await db().from("dishes").select("id").eq("id", id).maybeSingle(),
  );
  if (!existing) {
    return NextResponse.json({ error: "Dish not found" }, { status: 404 });
  }

  const { count, error } = await db()
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("dish_id", id);
  if (error) throw new Error(error.message);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      {
        error:
          "This dish is on existing orders. Mark it unavailable instead of deleting.",
      },
      { status: 409 },
    );
  }

  const { error: deleteError } = await db().from("dishes").delete().eq("id", id);
  if (deleteError) throw new Error(deleteError.message);
  return NextResponse.json({ ok: true });
}
