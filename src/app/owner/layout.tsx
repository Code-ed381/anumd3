"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { OwnerNav } from "@/components/owner-nav";

export default function OwnerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isLogin = pathname === "/owner/login";

  return (
    <div className="flex min-h-full flex-col">
      {!isLogin && <OwnerNav />}
      {children}
    </div>
  );
}
