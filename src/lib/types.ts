export const OrderStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  CONFIRMED: "CONFIRMED",
  READY: "READY",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const ORDER_STATUSES = Object.values(OrderStatus);

export type OwnerRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  supabase_user_id: string;
  created_at: string;
};

export type PushSubscriptionRow = {
  id: string;
  owner_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
};

export type DishRow = {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  photo_url: string | null;
  is_available: boolean;
  serve_weekdays?: number[];
  created_at: string;
  updated_at: string;
};

export type MealScheduleOverrideRow = {
  serve_date: string;
  dish_id: string | null;
  note: string | null;
  created_at: string;
};

export type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  created_at: string;
};

export type OrderRow = {
  id: string;
  customer_id: string;
  pickup_date: string;
  pickup_time: string;
  delivery_address: string | null;
  status: OrderStatus;
  total_amount: number | string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  dish_id: string;
  quantity: number;
  unit_price: number | string;
};

export type PaymentRow = {
  id: string;
  order_id: string;
  reference: string;
  amount: number | string;
  channel: string | null;
  status: string;
  paid_at: string | null;
  raw_webhook_data: unknown;
  created_at: string;
};

export type OrderItemWithDish = OrderItemRow & { dish: DishRow };
export type OrderWithDetails = OrderRow & {
  customer: CustomerRow;
  items: OrderItemWithDish[];
  payment: PaymentRow | null;
};
