import { Suspense } from "react";

import { AccountBillingClient } from "./account-billing-client";

export default function AccountBillingPage() {
  return (
    <Suspense
      fallback={
        <div className="ds-app-shell p-6 md:p-8">
          <p className="text-ds-on-surface-variant text-sm">Loading billing…</p>
        </div>
      }
    >
      <AccountBillingClient />
    </Suspense>
  );
}
