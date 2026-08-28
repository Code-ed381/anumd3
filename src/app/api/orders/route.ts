import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { db, ORDER_SELECT, must, throwIfError } from "@/lib/db";
import { moneyToNumber } from "@/lib/money";
import { normalizeOrder, serializeOrder, getOrderById } from "@/lib/order";
import {
  dishAvailableOnDate,
  formatScheduleDate,
  loadScheduleData,
  resolveMealsForDate,
  upcomingDatesForDish,
} from "@/lib/schedule";
import { dateStringToUtcNoon, validatePickup } from "@/lib/pickup";
import { notifyCustomerOrderPlaced } from "@/lib/customer-alerts";
import { getVerifiedCustomerPhone } from "@/lib/customer-session";
import { normalizeGhanaPhone } from "@/lib/phone";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import {
  ORDER_STATUSES,
  OrderStatus,
  type CustomerRow,
  type DishRow,
  type OrderRow,
} from "@/lib/types";

export const dynamic = "force-dynamic";

type OrderBody = {
  name?: string;
  phone?: string;
  deliveryAddress?: string;
  pickupDate?: string;
  pickupTime?: string;
  notes?: string;
  items?: { dishId: string; quantity: number }[];
};

export async function GET(request: Request) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const date = searchParams.get("date");
  const statusFilter =
    statusParam && ORDER_STATUSES.includes(statusParam as OrderStatus)
      ? (statusParam as OrderStatus)
      : undefined;

  let query = db()
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const start = dateStringToUtcNoon(date);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    query = query
      .gte("pickup_date", start.toISOString())
      .lt("pickup_date", end.toISOString());
  }

  const rows = throwIfError(await query);
  const orders = (Array.isArray(rows) ? rows : [])
    .map((row) => normalizeOrder(row))
    .filter((order): order is NonNullable<typeof order> => order !== null);

  const now = new Date();
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();
  const startOfWeekDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  startOfWeekDate.setUTCDate(startOfWeekDate.getUTCDate() - 6);
  const startOfWeek = startOfWeekDate.toISOString();

  const paidStatuses = [
    OrderStatus.PAID,
    OrderStatus.CONFIRMED,
    OrderStatus.READY,
    OrderStatus.COMPLETED,
  ];

  const [todayResult, weekResult, weekPaidResult] = await Promise.all([
    db()
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfToday),
    db()
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfWeek),
    db()
      .from("orders")
      .select("total_amount")
      .gte("created_at", startOfWeek)
      .in("status", paidStatuses),
  ]);

  if (todayResult.error) throw new Error(todayResult.error.message);
  if (weekResult.error) throw new Error(weekResult.error.message);
  if (weekPaidResult.error) throw new Error(weekPaidResult.error.message);

  const revenueThisWeek = (weekPaidResult.data ?? []).reduce(
    (sum, order) => sum + moneyToNumber(order.total_amount),
    0,
  );

  return NextResponse.json({
    orders: orders.map(serializeOrder),
    stats: {
      ordersToday: todayResult.count ?? 0,
      ordersThisWeek: weekResult.count ?? 0,
      revenueThisWeek,
    },
  });
}

export async function POST(request: Request) {
  if (!rateLimit(`orders:${clientKey(request)}`, 8, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many orders. Please wait a few minutes." },
      { status: 429 },
    );
  }

  const body = (await request.json()) as OrderBody;
  const name = body.name?.trim() || "";
  const phone = normalizeGhanaPhone(body.phone || "");
  const deliveryAddress = body.deliveryAddress?.trim() || "";
  const pickupDate = body.pickupDate || "";
  const pickupTime = body.pickupTime || "";
  const notes = body.notes?.trim() || null;
  const items = body.items || [];

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json(
      { error: "Enter a valid Ghana phone number" },
      { status: 400 },
    );
  }
  if (deliveryAddress.length < 10) {
    return NextResponse.json(
      { error: "Enter a precise delivery address (at least 10 characters)" },
      { status: 400 },
    );
  }

  const sessionPhone = await getVerifiedCustomerPhone();
  if (!sessionPhone || sessionPhone !== phone) {
    return NextResponse.json(
      { error: "Verify your phone number before placing an order." },
      { status: 403 },
    );
  }

  const pickupError = validatePickup(pickupDate, pickupTime);
  if (pickupError) {
    return NextResponse.json({ error: pickupError }, { status: 400 });
  }

  try {
    const { dishes: scheduleDishes, overrides } = await loadScheduleData();
    const resolvedDay = resolveMealsForDate(
      pickupDate,
      scheduleDishes,
      overrides,
    );
    if (resolvedDay.cancelled) {
      return NextResponse.json(
        { error: "The kitchen is closed on the selected pickup date." },
        { status: 400 },
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    for (const item of items) {
      if (!item.dishId || !Number.isInteger(item.quantity) || item.quantity < 1) {
        return NextResponse.json(
          { error: "Each item needs a dish and a quantity of at least 1" },
          { status: 400 },
        );
      }
    }

    const dishIds = items.map((item) => item.dishId);
    const dishes = throwIfError(
      await db().from("dishes").select("*").in("id", dishIds),
    ) as DishRow[];
    const dishMap = new Map(dishes.map((dish) => [dish.id, dish]));

    const unavailable: string[] = [];
    let total = 0;
    const orderItems: { dish_id: string; quantity: number; unit_price: number }[] =
      [];

    for (const item of items) {
      const dish = dishMap.get(item.dishId);
      if (!dish || !dish.is_available) {
        unavailable.push(dish?.name || "Unknown dish");
        continue;
      }
      if (
        !dishAvailableOnDate(
          item.dishId,
          pickupDate,
          scheduleDishes,
          overrides,
        )
      ) {
        const dates = upcomingDatesForDish(
          item.dishId,
          scheduleDishes,
          overrides,
        );
        const hint =
          dates.length > 0
            ? ` Available on ${dates
                .slice(0, 3)
                .map((date) => formatScheduleDate(date))
                .join(", ")}.`
            : "";
        return NextResponse.json(
          {
            error: `${dish.name} is not served on ${formatScheduleDate(pickupDate)}.${hint}`,
          },
          { status: 400 },
        );
      }
      const unitPrice = moneyToNumber(dish.price);
      total += unitPrice * item.quantity;
      orderItems.push({
        dish_id: dish.id,
        quantity: item.quantity,
        unit_price: unitPrice,
      });
    }

    if (unavailable.length > 0) {
      return NextResponse.json(
        {
          error: `These dishes are no longer available: ${unavailable.join(", ")}`,
        },
        { status: 400 },
      );
    }

    let customer = throwIfError(
      await db()
        .from("customers")
        .select("*")
        .eq("phone", phone)
        .maybeSingle(),
    ) as CustomerRow | null;

    if (!customer) {
      customer = must(
        throwIfError(
          await db()
            .from("customers")
            .insert({ name, phone, email: null })
            .select()
            .single(),
        ) as CustomerRow | null,
        "Could not create customer",
      );
    } else if (customer.name !== name) {
      customer = must(
        throwIfError(
          await db()
            .from("customers")
            .update({ name })
            .eq("id", customer.id)
            .select()
            .single(),
        ) as CustomerRow | null,
        "Could not update customer",
      );
    }

    const created = must(
      throwIfError(
        await db()
          .from("orders")
          .insert({
            customer_id: customer.id,
            pickup_date: dateStringToUtcNoon(pickupDate).toISOString(),
            pickup_time: pickupTime,
            delivery_address: deliveryAddress,
            total_amount: total,
            notes,
          })
          .select()
          .single(),
      ) as OrderRow | null,
      "Could not create order",
    );

    const { error: itemsError } = await db().from("order_items").insert(
      orderItems.map((item) => ({ ...item, order_id: created.id })),
    );
    if (itemsError) throw new Error(itemsError.message);

    const order = await getOrderById(created.id);
    if (!order) {
      return NextResponse.json({ error: "Order not found after create" }, { status: 500 });
    }

    void notifyCustomerOrderPlaced(created.id);

    return NextResponse.json({ order: serializeOrder(order) }, { status: 201 });
  } catch (error) {
    console.error("Order creation failed:", error);
    const message =
      error instanceof Error ? error.message : "Could not create order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
