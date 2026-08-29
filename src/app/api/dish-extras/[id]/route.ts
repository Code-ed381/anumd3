import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = (await request.json()) as {
    name?: string;
    price?: number;
    is_available?: boolean;
    sort_order?: number;
  };

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.price !== undefined) updates.price = Number(body.price);
  if (body.is_available !== undefined) updates.is_available = body.is_available;
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order;

  if (updates.name !== undefined && !updates.name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { error } = await db()
    .from("dish_extras")
    .update(updates)
    .eq("id", id);

  if (error) throw new Error(error.message);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const { id } = await params;
  const { error } = await db().from("dish_extras").delete().eq("id", id);

  if (error) throw new Error(error.message);
  return NextResponse.json({ ok: true });
}
