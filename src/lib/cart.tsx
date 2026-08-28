"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { formatScheduleDate } from "@/lib/schedule";

export type CartItem = {
  dishId: string;
  name: string;
  price: number;
  photoUrl: string | null;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  pickupDate: string | null;
  ready: boolean;
  addItem: (
    item: Omit<CartItem, "quantity">,
    pickupDate: string,
    quantity?: number,
  ) => { ok: true } | { ok: false; error: string };
  setQuantity: (dishId: string, quantity: number) => void;
  removeItem: (dishId: string) => void;
  clear: () => void;
  count: number;
  total: number;
};

const STORAGE_KEY = "preorder-cart";
const CartContext = createContext<CartContextValue | null>(null);

type StoredCart = {
  pickupDate: string | null;
  items: CartItem[];
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [pickupDate, setPickupDate] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as StoredCart | CartItem[];
          if (Array.isArray(parsed)) {
            setItems(parsed);
            setPickupDate(null);
          } else {
            setItems(parsed.items ?? []);
            setPickupDate(parsed.pickupDate ?? null);
          }
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (ready) {
      const payload: StoredCart = { pickupDate, items };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }
  }, [items, pickupDate, ready]);

  const addItem = useCallback(
    (
      item: Omit<CartItem, "quantity">,
      date: string,
      quantity = 1,
    ): { ok: true } | { ok: false; error: string } => {
      if (pickupDate && pickupDate !== date) {
        return {
          ok: false,
          error: `Your cart is for ${formatScheduleDate(pickupDate)}. Clear the cart to order for another day.`,
        };
      }

      setPickupDate(date);
      setItems((current) => {
        const existing = current.find((row) => row.dishId === item.dishId);
        if (existing) {
          return current.map((row) =>
            row.dishId === item.dishId
              ? { ...row, quantity: row.quantity + quantity, price: item.price }
              : row,
          );
        }
        return [...current, { ...item, quantity }];
      });
      return { ok: true };
    },
    [pickupDate],
  );

  const setQuantity = useCallback((dishId: string, quantity: number) => {
    setItems((current) => {
      if (quantity < 1) {
        const next = current.filter((row) => row.dishId !== dishId);
        if (next.length === 0) {
          setPickupDate(null);
        }
        return next;
      }
      return current.map((row) =>
        row.dishId === dishId ? { ...row, quantity } : row,
      );
    });
  }, []);

  const removeItem = useCallback((dishId: string) => {
    setItems((current) => {
      const next = current.filter((row) => row.dishId !== dishId);
      if (next.length === 0) {
        setPickupDate(null);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    setPickupDate(null);
  }, []);

  const value = useMemo(
    () => ({
      items,
      pickupDate,
      ready,
      addItem,
      setQuantity,
      removeItem,
      clear,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    }),
    [items, pickupDate, ready, addItem, setQuantity, removeItem, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
