import Image from "next/image";
import Link from "next/link";
import { getBusinessName } from "@/lib/config";
import { db } from "@/lib/db";
import { moneyToNumber } from "@/lib/money";
import type { DishRow } from "@/lib/types";

export const dynamic = "force-dynamic";

const PHONE_DIGITS = (process.env.OWNER_PHONE || "233542020730").replace(
  /[^0-9]/g,
  "",
);

async function getFeaturedDishes(): Promise<
  { name: string; price: number; photoUrl: string | null; description: string | null }[]
> {
  try {
    const rows = (
      await db()
        .from("dishes")
        .select("name, price, photo_url, description")
        .eq("is_available", true)
        .order("name")
        .limit(3)
    ).data as DishRow[] | null;
    if (!rows || rows.length === 0) return [];
    return rows.map((d) => ({
      name: d.name,
      price: moneyToNumber(d.price),
      photoUrl: d.photo_url,
      description: d.description,
    }));
  } catch {
    return [];
  }
}

export default async function Home() {
  const businessName = getBusinessName();
  const dishes = await getFeaturedDishes();

  return (
    <div className="flex min-h-full flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[color:var(--brand-green-dark)]">
        <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--brand-green-dark)] via-[color:var(--brand-green-dark)] to-[color:var(--brand-green)] opacity-90" />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 py-16 sm:flex-row sm:py-24">
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-3xl font-bold leading-tight text-white sm:text-5xl">
              {businessName}
            </h1>
            <p className="mt-4 text-lg text-white/80">
              Pre-order authentic Ghanaian meals for delivery. Fresh, hot, and
              made with love — delivered to your doorstep.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 sm:justify-start">
              <Link
                href="/menu"
                className="rounded-full bg-[color:var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[color:var(--accent-dark)]"
              >
                Browse Menu
              </Link>
              <a
                href={`https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent("Hi, I'm interested in placing a bulk order.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                WhatsApp for Bulk Orders
              </a>
            </div>
          </div>
          <div className="relative h-56 w-56 shrink-0 overflow-hidden rounded-3xl shadow-2xl sm:h-72 sm:w-72">
            <Image
              src="/owner.jpeg"
              alt="Owner"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      </section>

      {/* About */}
      <section className="bg-[color:var(--card)]">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:flex sm:items-center sm:gap-12 sm:py-20">
          <div className="relative mx-auto mb-8 h-48 w-48 shrink-0 overflow-hidden rounded-2xl shadow-lg sm:mb-0 sm:h-64 sm:w-64">
            <Image
              src="/owner.jpeg"
              alt="About us"
              fill
              className="object-cover"
            />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[color:var(--brand-green-dark)] sm:text-3xl">
              Made with passion, served with pride
            </h2>
            <p className="mt-4 leading-relaxed text-[color:var(--muted)]">
              Every meal we prepare carries the rich flavours of Ghana. From
              perfectly seasoned jollof rice to smoky grilled chicken, we use
              time-honoured recipes and the freshest ingredients. Pre-order
              today and enjoy authentic Ghanaian cuisine delivered right to your
              door.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Dishes */}
      <section className="bg-[color:var(--background)]">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
          <h2 className="text-center text-2xl font-bold text-[color:var(--brand-green-dark)] sm:text-3xl">
            Featured Dishes
          </h2>
          <p className="mt-2 text-center text-sm text-[color:var(--muted)]">
            A taste of what we offer
          </p>

          {dishes.length > 0 ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {dishes.map((dish) => (
                <div
                  key={dish.name}
                  className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-sm"
                >
                  <div className="relative aspect-[16/10] bg-stone-100">
                    {dish.photoUrl ? (
                      <Image
                        src={dish.photoUrl}
                        alt={dish.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-stone-400">
                        No photo
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{dish.name}</h3>
                      <span className="shrink-0 font-semibold text-[color:var(--brand-green)]">
                        GHS {dish.price.toFixed(2)}
                      </span>
                    </div>
                    {dish.description && (
                      <p className="mt-1 text-sm text-[color:var(--muted)] line-clamp-2">
                        {dish.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {["Jollof Rice", "Grilled Chicken", "Kelewele"].map((name) => (
                <div
                  key={name}
                  className="overflow-hidden rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--card)]"
                >
                  <div className="flex aspect-[16/10] items-center justify-center bg-stone-50 text-4xl">
                    🍽️
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold">{name}</h3>
                    <p className="mt-1 text-sm text-[color:var(--muted)]">
                      Coming soon
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 text-center">
            <Link
              href="/menu"
              className="inline-flex rounded-full bg-[color:var(--accent)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[color:var(--accent-dark)]"
            >
              View Full Menu
            </Link>
          </div>
        </div>
      </section>

      {/* Contact / CTA */}
      <section className="bg-[color:var(--brand-green-dark)]">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:py-20">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Ready to order?
          </h2>
          <p className="mt-3 text-white/70">
            Place your pre-order now or reach out for bulk enquiries.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/menu"
              className="rounded-full bg-[color:var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[color:var(--accent-dark)]"
            >
              Order Now
            </Link>
            <a
              href={`https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent("Hi, I'm interested in placing a bulk order.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              WhatsApp Us
            </a>
          </div>
          <p className="mt-8 text-sm text-white/50">
            Pre-order · Delivery · Bulk Orders
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[color:var(--border)] bg-[color:var(--card)] py-6 text-center text-xs text-[color:var(--muted)]">
        © {new Date().getFullYear()} {businessName}. All rights reserved.
      </footer>
    </div>
  );
}
