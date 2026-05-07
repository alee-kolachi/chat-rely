import { Suspense } from "react";
import { VerifyEmailClient } from "./verify-email-client";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="bg-ds-neutral flex min-h-screen items-center justify-center px-6">
          <p className="text-ds-on-surface-variant text-sm">Loading…</p>
        </main>
      }
    >
      <VerifyEmailClient />
    </Suspense>
  );
}
