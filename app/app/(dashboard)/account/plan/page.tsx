import { Suspense } from "react";

import { AccountPlanContent } from "./account-plan-content";

export default function AccountPlanPage() {
  return (
    <Suspense
      fallback={
        <div className="ds-app-shell p-6 md:p-8">
          <p className="text-ds-on-surface-variant text-sm">Loading…</p>
        </div>
      }
    >
      <AccountPlanContent />
    </Suspense>
  );
}
