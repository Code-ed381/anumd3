import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { db, throwIfError } from "@/lib/db";
import { getOrderById, serializeOrder } from "@/lib/order";
import { STATUS_TRANSITIONS } from "@/lib/payment-success";
import { ORDER_STATUSES, OrderStatus, type OrderRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const { id } = await ctx.params;
  const body = (await request.json()) as { status?: OrderStatus };
  const nextStatus = body.status;

  if (!nextStatus || !ORDER_STATUSES.includes(nextStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const order = throwIfError(
    await db()
      .from("orders")
      .select("id, status")
      .eq("id", id)
      .maybeSingle<Pick<OrderRow, "id" | "status">>(),
  );
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const allowed = STATUS_TRANSITIONS[order.status];
  if (!allowed.includes(nextStatus)) {
    return NextResponse.json(
      { error: `Cannot move from ${order.status} to ${nextStatus}` },
      { status: 400 },
    );
  }

  const { error } = await db()
    .from("orders")
    .update({ status: nextStatus })
    .eq("id", id);
  if (error) throw new Error(error.message);

  const updated = await getOrderById(id);
  return NextResponse.json({ order: serializeOrder(updated!) });
}
