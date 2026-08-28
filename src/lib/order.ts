import { db, ORDER_SELECT, throwIfError } from "@/lib/db";
import { moneyToNumber } from "@/lib/money";
import { utcDateToDateString } from "@/lib/pickup";
import type {
  CustomerRow,
  DishRow,
  OrderItemRow,
  OrderRow,
  OrderWithDetails,
  PaymentRow,
} from "@/lib/types";

export type { OrderWithDetails };

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function asMany<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function serializeDish(dish: DishRow) {
  return {
    id: dish.id,
    name: dish.name,
    description: dish.description,
    price: moneyToNumber(dish.price),
    photoUrl: dish.photo_url,
    isAvailable: dish.is_available,
    serveWeekdays: dish.serve_weekdays ?? [],
    createdAt: dish.created_at,
    updatedAt: dish.updated_at,
  };
}

export function serializeOrder(order: OrderWithDetails) {
  return {
    id: order.id,
    status: order.status,
    pickupDate: utcDateToDateString(order.pickup_date),
    pickupTime: order.pickup_time,
    deliveryAddress: order.delivery_address,
    totalAmount: moneyToNumber(order.total_amount),
    notes: order.notes,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    customer: {
      id: order.customer.id,
      name: order.customer.name,
      phone: order.customer.phone,
      email: order.customer.email,
    },
    items: order.items.map((item) => ({
      id: item.id,
      dishId: item.dish_id,
      name: item.dish.name,
      quantity: item.quantity,
      unitPrice: moneyToNumber(item.unit_price),
      lineTotal: moneyToNumber(item.unit_price) * item.quantity,
    })),
    payment: order.payment
      ? {
          reference: order.payment.reference,
          status: order.payment.status,
          channel: order.payment.channel,
          paidAt: order.payment.paid_at,
        }
      : null,
  };
}

export function itemSummary(order: OrderWithDetails) {
  return order.items
    .map((item) => `${item.quantity}x ${item.dish.name}`)
    .join(", ");
}

type NestedItem = OrderItemRow & { dish: DishRow | DishRow[] | null };
type NestedOrder = OrderRow & {
  customer: CustomerRow | CustomerRow[] | null;
  items: NestedItem[] | NestedItem | null;
  payment: PaymentRow | PaymentRow[] | null;
};

export function normalizeOrder(row: unknown): OrderWithDetails | null {
  if (!row || typeof row !== "object") return null;
  const nested = row as NestedOrder;
  const customer = asOne(nested.customer);
  if (!customer) return null;

  const items = asMany(nested.items)
    .map((item) => {
      const dish = asOne(item.dish);
      if (!dish) return null;
      return { ...item, dish };
    })
    .filter((item): item is OrderItemRow & { dish: DishRow } => item !== null);

  return {
    ...nested,
    customer,
    items,
    payment: asOne(nested.payment),
  };
}

export async function getOrderById(id: string) {
  const result = await db()
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return normalizeOrder(result.data);
}

export async function getOrderByPaymentReference(reference: string) {
  const payment = throwIfError(
    await db()
      .from("payments")
      .select("order_id")
      .eq("reference", reference)
      .maybeSingle(),
  ) as { order_id: string } | null;
  if (!payment) return null;
  return getOrderById(payment.order_id);
}

export async function getOrdersByCustomerPhone(phone: string, limit = 20) {
  const customer = throwIfError(
    await db()
      .from("customers")
      .select("id")
      .eq("phone", phone)
      .maybeSingle(),
  ) as { id: string } | null;

  if (!customer) return [];

  const rows = throwIfError(
    await db()
      .from("orders")
      .select(ORDER_SELECT)
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(limit),
  );

  return (Array.isArray(rows) ? rows : [])
    .map((row) => normalizeOrder(row))
    .filter((order): order is OrderWithDetails => order !== null)
    .map(serializeOrder);
}
