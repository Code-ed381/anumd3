"use client";

import Image from "next/image";
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
    <header className="sticky top-0 z-20 border-b border-[color:var(--border)] bg-[color:var(--card)]">
      <div className="h-1 bg-[color:var(--brand-green-dark)]" aria-hidden />
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.jpeg"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 rounded-lg object-cover ring-1 ring-[color:var(--border)]"
          />
          <nav className="flex gap-1">
            {LINKS.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                    active
                      ? "bg-[color:var(--brand-green-dark)] text-white"
                      : "text-[color:var(--muted)] hover:bg-[color:var(--brand-green)]/10 hover:text-[color:var(--foreground)]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="text-sm text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
