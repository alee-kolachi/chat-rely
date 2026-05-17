"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/app/(auth)/forgot-password/actions";

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, undefined);

  if (state?.success) {
    return (
      <div className="space-y-4" role="status">
        <p className="text-ds-on-surface text-sm">
          Check your inbox for a reset link. If you do not see it within a few minutes, look in spam
          or promotions.
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-4" action={formAction}>
      <div className="space-y-1.5">
        <label htmlFor="forgot-email" className="ds-app-label">
          Email address
        </label>
        <input
          id="forgot-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="name@company.com"
          className="border-ds-outline focus:border-ds-primary placeholder:text-ds-on-surface-variant w-full rounded-ds-md border bg-ds-surface px-4 py-2.5 text-sm transition-all focus:ring-2 focus:ring-black/5"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="bg-ds-primary text-ds-on-primary hover:bg-ds-primary-hover w-full rounded-ds-md py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Sending…" : "Send reset link"}
      </button>
      {state?.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
