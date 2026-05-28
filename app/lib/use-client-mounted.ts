"use client";

import { useEffect, useState } from "react";

/** True after the first client commit. Use to avoid locale/time-dependent SSR hydration mismatches. */
export function useClientMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
