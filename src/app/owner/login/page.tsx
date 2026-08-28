"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase";
import { getBusinessName } from "@/lib/config";

export default function OwnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createBrowserSupabase();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        throw signInError;
      }
      router.replace("/owner/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-4 py-12">
      <Image
        src="/logo.jpeg"
        alt=""
        width={80}
        height={80}
        className="mx-auto h-20 w-20 rounded-2xl object-cover ring-2 ring-[color:var(--border)]"
        priority
      />
      <p className="mt-6 text-center text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-green)]">
        Owner
      </p>
      <h1 className="mt-2 text-center text-2xl font-semibold text-[color:var(--foreground)]">
        {getBusinessName()}
      </h1>
      <p className="mt-1 text-center text-sm text-[color:var(--muted)]">
        Sign in with the account created in the Supabase dashboard.
      </p>
      <form onSubmit={(event) => void submit(event)} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-3"
            autoComplete="email"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-3"
            autoComplete="current-password"
          />
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[color:var(--brand-green-dark)] py-3 text-sm font-medium text-white hover:opacity-95 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
