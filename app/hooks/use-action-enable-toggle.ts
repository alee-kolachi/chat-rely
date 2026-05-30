"use client";

import { useCallback, useRef, useState } from "react";
import { BackendApiError, backendFetch } from "@/lib/backend-api";

export function useActionEnableToggle(
  agentId: string | undefined,
  onRefresh: (opts?: { silent?: boolean }) => Promise<void>,
  onError?: (message: string) => void
) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const inFlightKeys = useRef(new Set<string>());

  const resolveEnabled = useCallback(
    (actionKey: string, serverEnabled: boolean) => {
      if (Object.prototype.hasOwnProperty.call(optimistic, actionKey)) {
        return optimistic[actionKey];
      }
      return serverEnabled;
    },
    [optimistic]
  );

  const isTogglePending = useCallback(
    (actionKey: string) => pendingKey === actionKey,
    [pendingKey]
  );

  const toggleEnabled = useCallback(
    async (actionKey: string, next: boolean) => {
      if (!agentId || inFlightKeys.current.has(actionKey)) return;

      inFlightKeys.current.add(actionKey);
      setPendingKey(actionKey);
      setOptimistic((prev) => ({ ...prev, [actionKey]: next }));

      try {
        await backendFetch(`/api/v1/agents/${agentId}/actions/${encodeURIComponent(actionKey)}`, {
          method: "PATCH",
          body: JSON.stringify({ enabled: next }),
        });
        await onRefresh({ silent: true });
      } catch (e) {
        setOptimistic((prev) => {
          const copy = { ...prev };
          delete copy[actionKey];
          return copy;
        });
        let msg =
          e instanceof BackendApiError ? e.message : e instanceof Error ? e.message : "Could not update action";
        if (e instanceof BackendApiError && e.code === "plan.action_limit") {
          msg =
            "Your plan limit is reached. Disable another Shopify action or upgrade your plan to enable more.";
        }
        onError?.(msg);
      } finally {
        inFlightKeys.current.delete(actionKey);
        setPendingKey((current) => (current === actionKey ? null : current));
        setOptimistic((prev) => {
          const copy = { ...prev };
          delete copy[actionKey];
          return copy;
        });
      }
    },
    [agentId, onRefresh, onError]
  );

  return { resolveEnabled, isTogglePending, toggleEnabled };
}
