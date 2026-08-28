"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase";

const LINKS = [
  { href: "/owner/dashboard", label: "Orders" },
  { href: "/owner/menu-editor", label: "Menu" },
  { href: "/owner/schedule", label: "Schedule" },
];

export function OwnerNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.replace("/owner/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <nav className="flex gap-1">
          {LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                  active
                    ? "bg-[color:var(--accent)] text-white"
                    : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => void logout()}
          className="text-sm text-stone-500 hover:text-stone-800"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
