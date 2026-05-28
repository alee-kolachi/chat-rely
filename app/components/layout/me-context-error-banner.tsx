"use client";

import { useMeContext } from "@/components/layout/me-context-provider";

export function MeContextErrorBanner() {
  const { error, loading, refresh } = useMeContext();

  if (loading || !error) {
    return null;
  }

  return (
    <div
      className="border-amber-300/80 bg-amber-50 text-amber-950 flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2.5 text-sm sm:px-6"
      role="alert"
    >
      <p className="min-w-0">
        Account data could not be loaded. Some limits and billing info may be missing.
      </p>
      <button
        type="button"
        onClick={() => void refresh()}
        className="text-amber-950 shrink-0 rounded-md border border-amber-400/80 bg-white px-3 py-1 text-xs font-semibold hover:bg-amber-100"
      >
        Retry
      </button>
    </div>
  );
}
