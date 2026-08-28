"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") || searchParams.get("trxref");

  useEffect(() => {
    if (reference) {
      router.replace(`/order-status/${encodeURIComponent(reference)}`);
    }
  }, [reference, router]);

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10 text-center">
      {reference ? (
        <p className="text-stone-600">Redirecting to your order…</p>
      ) : (
        <p className="text-red-700">Missing payment reference.</p>
      )}
    </main>
  );
}

export default function PaymentCallbackPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <Suspense
        fallback={
          <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10 text-center">
            <p className="text-stone-600">Loading…</p>
          </main>
        }
      >
        <CallbackContent />
      </Suspense>
    </div>
  );
}
