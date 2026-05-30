"use client";

import type { Session } from "@supabase/supabase-js";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updatePasswordWithSession } from "@/app/(auth)/update-password/actions";
import { appButtonClassName } from "@/lib/button-styles";
import { createBrowserSupabaseClient } from "@/lib/supabase";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updatePasswordWithSession, undefined);
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    void supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      setSessionReady(Boolean(data.session?.access_token));
    });
  }, []);

  if (sessionReady === false) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600" role="alert">
          This reset link is invalid or has expired. Request a new one from the log in page.
        </p>
        <button
          type="button"
          onClick={() => router.push("/forgot-password")}
          className="text-ds-primary text-sm font-semibold hover:underline"
        >
          Request a new link
        </button>
      </div>
    );
  }

  if (sessionReady === null) {
    return <p className="text-ds-on-surface-variant text-sm">Checking your session…</p>;
  }

  return (
    <form className="space-y-4" action={formAction}>
      <div className="space-y-1.5">
        <label htmlFor="new-password" className="ds-app-label">
          New password
        </label>
        <input
          id="new-password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          placeholder="••••••••"
          className="border-ds-outline focus:border-ds-primary placeholder:text-ds-on-surface-variant w-full rounded-ds-md border bg-ds-surface px-4 py-2.5 text-sm transition-all focus:ring-2 focus:ring-black/5"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="confirm-password" className="ds-app-label">
          Confirm password
        </label>
        <input
          id="confirm-password"
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          placeholder="••••••••"
          className="border-ds-outline focus:border-ds-primary placeholder:text-ds-on-surface-variant w-full rounded-ds-md border bg-ds-surface px-4 py-2.5 text-sm transition-all focus:ring-2 focus:ring-black/5"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className={appButtonClassName("primary", { className: "w-full py-3" })}
      >
        {isPending ? "Saving…" : "Update password"}
      </button>
      {state?.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
