import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { db, must, throwIfError } from "@/lib/db";
import { createServerSupabase } from "@/lib/supabase-server";
import type { OwnerRow } from "@/lib/types";

export async function ensureOwner(user: User) {
  const name =
    (typeof user.user_metadata?.full_name === "string" &&
      user.user_metadata.full_name) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    user.email?.split("@")[0] ||
    "Owner";

  const owner = must(
    throwIfError(
      await db()
        .from("owners")
        .upsert(
          {
            name,
            phone: process.env.OWNER_PHONE || "233000000000",
            email: user.email,
            supabase_user_id: user.id,
          },
          { onConflict: "supabase_user_id" },
        )
        .select()
        .single(),
    ) as OwnerRow | null,
    "Could not save owner",
  );
  return owner;
}

export async function requireOwner() {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }

    const owner = await ensureOwner(user);
    return { user, owner };
  } catch {
    return {
      error: NextResponse.json(
        { error: "Auth is not configured" },
        { status: 503 },
      ),
    };
  }
}
