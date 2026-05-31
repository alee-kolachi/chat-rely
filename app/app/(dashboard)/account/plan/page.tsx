import { Suspense } from "react";

import { AccountPlanContent } from "./account-plan-content";

export default function AccountPlanPage() {
  return (
    <Suspense
      fallback={
        <div className="ds-app-shell">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
            <div className="space-y-3">
              <div className="bg-ds-sidebar h-8 w-24 animate-pulse rounded-md" />
              <div className="bg-ds-sidebar h-4 w-80 max-w-full animate-pulse rounded-md" />
            </div>
            <div className="border-ds-outline bg-ds-surface h-48 animate-pulse rounded-ds-xl border shadow-sm" />
          </div>
        </div>
      }
    >
      <AccountPlanContent />
    </Suspense>
  );
}
