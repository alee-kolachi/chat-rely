"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";

export function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get("email")?.trim() ?? "";
  const [email, setEmail] = useState(emailFromUrl);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cooldownKey = useMemo(() => `chatrely.verify-email.cooldown:${email}`, [email]);

  const resend = useCallback(async () => {
    const target = email.trim();
    if (!target || !target.includes("@")) {
      setError("Enter the email you used to sign up.");
      return;
    }
    const last = typeof window !== "undefined" ? window.sessionStorage.getItem(cooldownKey) : null;
    if (last) {
      const wait = 60 - Math.floor((Date.now() - Number.parseInt(last, 10)) / 1000);
      if (wait > 0) {
        setError(`Please wait ${wait}s before resending.`);
        return;
      }
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: err } = await supabase.auth.resend({ type: "signup", email: target });
      if (err) {
        setError(err.message);
        return;
      }
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(cooldownKey, String(Date.now()));
      }
      setMessage("Verification email sent. Check your inbox and spam folder.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not resend email");
    } finally {
      setBusy(false);
    }
  }, [email, cooldownKey]);

  return (
    <main className="bg-ds-neutral flex min-h-screen items-center justify-center px-6">
      <div className="border-ds-outline w-full max-w-md rounded-ds-xl border bg-ds-surface p-8 shadow-md">
        <h1 className="text-ds-on-surface text-2xl font-bold tracking-tight">Check your email</h1>
        <p className="text-ds-on-surface-variant mt-3 text-sm leading-relaxed">
          We sent you a verification link. Open it to confirm your account and finish setup.
        </p>
        <label className="text-ds-on-surface-variant mt-6 block text-xs font-semibold uppercase tracking-wide">
          Email
        </label>
        <input
          className="ds-app-field mt-2 w-full rounded-ds-md"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void resend()}
            className="bg-ds-primary text-ds-on-primary hover:bg-ds-primary-hover w-full rounded-ds-md px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {busy ? "Sending…" : "Resend verification email"}
          </button>
          <Link
            href="/login"
            className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar inline-flex w-full justify-center rounded-ds-md border bg-white px-4 py-2.5 text-sm font-semibold"
          >
            Back to login
          </Link>
        </div>
        {message ? <p className="text-emerald-800 mt-4 text-sm">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
      </div>
    </main>
  );
}
