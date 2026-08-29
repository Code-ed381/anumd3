"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase";

const LINKS = [
  { href: "/owner/dashboard", label: "Orders" },
  { href: "/owner/menu-editor", label: "Menu" },
  { href: "/owner/schedule", label: "Schedule" },
  { href: "/owner/settings", label: "Settings" },
];

export function OwnerNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.replace("/owner/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-[color:var(--border)] bg-[color:var(--card)]">
      <div className="h-1 bg-[color:var(--brand-green-dark)]" aria-hidden />
      <div className="mx-auto max-w-3xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.jpeg"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 rounded-lg object-cover ring-1 ring-[color:var(--border)]"
            />
            <nav className="hidden gap-1 sm:flex">
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void logout()}
              className="hidden text-sm text-[color:var(--muted)] hover:text-[color:var(--foreground)] sm:block"
            >
              Log out
            </button>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="rounded-lg p-1.5 text-[color:var(--muted)] hover:bg-[color:var(--brand-green)]/10 sm:hidden"
              aria-label="Toggle menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-5 w-5"
              >
                {open ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
        {open && (
          <nav className="mt-2 flex flex-col gap-1 sm:hidden">
            {LINKS.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    active
                      ? "bg-[color:var(--brand-green-dark)] text-white"
                      : "text-[color:var(--muted)] hover:bg-[color:var(--brand-green)]/10 hover:text-[color:var(--foreground)]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-lg px-3 py-2 text-left text-sm font-medium text-[color:var(--muted)] hover:bg-red-50 hover:text-red-600"
            >
              Log out
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
