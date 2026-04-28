"use client";

import { useEffect } from "react";
import { backendFetch } from "@/lib/backend-api";

export function BackendBootstrap() {
  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        await backendFetch("/api/v1/bootstrap/me", { method: "POST" });
        if (!cancelled) {
          await backendFetch("/api/v1/me/context");
        }
      } catch {
        // Non-blocking bootstrap ping for now.
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

