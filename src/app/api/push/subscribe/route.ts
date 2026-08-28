import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { db, throwIfError } from "@/lib/db";
import type { PushSubscriptionRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const body = (await request.json()) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json(
      { error: "Invalid push subscription" },
      { status: 400 },
    );
  }

  const existing = throwIfError(
    await db()
      .from("push_subscriptions")
      .select("id")
      .eq("endpoint", body.endpoint)
      .maybeSingle(),
  ) as Pick<PushSubscriptionRow, "id"> | null;

  if (existing) {
    const owner = auth.owner;
    if (!owner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await db()
      .from("push_subscriptions")
      .update({
        owner_id: owner.id,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const owner = auth.owner;
    if (!owner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { error } = await db().from("push_subscriptions").insert({
      owner_id: owner.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    });
    if (error) throw new Error(error.message);
  }

  return NextResponse.json({ ok: true });
}
