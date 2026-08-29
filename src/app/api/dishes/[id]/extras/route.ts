import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { DishExtraRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { data, error } = await db()
    .from("dish_extras")
    .select("*")
    .or(`dish_id.eq.${id},dish_id.is.null`)
    .eq("is_available", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);

  return NextResponse.json({ extras: (data ?? []) as DishExtraRow[] });
}
