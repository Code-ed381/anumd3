import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { db, throwIfError } from "@/lib/db";
import type { DishExtraRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dishId = searchParams.get("dishId");

  let query = db()
    .from("dish_extras")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (dishId) {
    query = query.eq("dish_id", dishId);
  } else {
    query = query.is("dish_id", null);
  }

  const rows = throwIfError(await query) as DishExtraRow[];
  return NextResponse.json({ extras: rows });
}

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const body = (await request.json()) as {
    dishId?: string | null;
    name?: string;
    price?: number;
  };

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const price = Number(body.price) || 0;
  if (price < 0) {
    return NextResponse.json(
      { error: "Price cannot be negative" },
      { status: 400 },
    );
  }

  const { data, error } = await db()
    .from("dish_extras")
    .insert({
      dish_id: body.dishId || null,
      name,
      price,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return NextResponse.json({ extra: data }, { status: 201 });
}
