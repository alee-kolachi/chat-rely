"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApiActionCatalogEntry, ApiActionCatalogResponse } from "@/components/actions/action-catalog-types";
import {
  applyAgentIntegrationsCatalogCache,
} from "@/components/integrations/use-agent-integrations-bootstrap";
import {
  configsEqual,
  countActionDraftChanges,
  type ActionDraftPatch,
} from "@/lib/action-draft-utils";
import { BackendApiError, backendFetch } from "@/lib/backend-api";

export function useActionDrafts(
  agentId: string | undefined,
  entries: ApiActionCatalogEntry[] | undefined
) {
  const [drafts, setDrafts] = useState<Record<string, ActionDraftPatch>>({});

  useEffect(() => {
    setDrafts({});
  }, [agentId]);

  const entryByKey = useMemo(
    () => new Map((entries ?? []).map((entry) => [entry.action_key, entry])),
    [entries]
  );

  const resolveEnabled = useCallback(
    (actionKey: string, serverEnabled = false) => {
      const draftEnabled = drafts[actionKey]?.enabled;
      if (draftEnabled !== undefined) return draftEnabled;
      const entry = entryByKey.get(actionKey);
      return entry ? Boolean(entry.enabled) : serverEnabled;
    },
    [drafts, entryByKey]
  );

  const setEnabledDraft = useCallback(
    (actionKey: string, next: boolean) => {
      const serverEnabled = Boolean(entryByKey.get(actionKey)?.enabled);
      setDrafts((prev) => {
        const copy = { ...prev };
        const patch = { ...(copy[actionKey] ?? {}) };
        if (next === serverEnabled) {
          delete patch.enabled;
        } else {
          patch.enabled = next;
        }
        if (Object.keys(patch).length === 0) {
          delete copy[actionKey];
        } else {
          copy[actionKey] = patch;
        }
        return copy;
      });
    },
    [entryByKey]
  );

  const getConfigDraft = useCallback(
    (actionKey: string): Record<string, unknown> => {
      const draftConfig = drafts[actionKey]?.config;
      if (draftConfig !== undefined) return draftConfig;
      return (entryByKey.get(actionKey)?.config ?? {}) as Record<string, unknown>;
    },
    [drafts, entryByKey]
  );

  const setConfigDraft = useCallback(
    (actionKey: string, config: Record<string, unknown>) => {
      const serverConfig = (entryByKey.get(actionKey)?.config ?? {}) as Record<string, unknown>;
      setDrafts((prev) => {
        const copy = { ...prev };
        const patch = { ...(copy[actionKey] ?? {}) };
        if (configsEqual(config, serverConfig)) {
          delete patch.config;
        } else {
          patch.config = config;
        }
        if (Object.keys(patch).length === 0) {
          delete copy[actionKey];
        } else {
          copy[actionKey] = patch;
        }
        return copy;
      });
    },
    [entryByKey]
  );

  const dirtyKeys = useMemo(() => Object.keys(drafts), [drafts]);
  const isDirty = dirtyKeys.length > 0;
  const changeCount = countActionDraftChanges(drafts);

  const cancelAll = useCallback(() => setDrafts({}), []);

  const saveAll = useCallback(
    async (onError?: (message: string) => void) => {
      if (!agentId || !isDirty) return true;

      const updates = dirtyKeys.flatMap((actionKey) => {
        const patch = drafts[actionKey];
        if (!patch) return [];
        const body: Record<string, unknown> = { action_key: actionKey };
        if (patch.enabled !== undefined) body.enabled = patch.enabled;
        if (patch.config !== undefined) body.config = patch.config;
        if (Object.keys(body).length <= 1) return [];
        return [body];
      });
      if (updates.length === 0) {
        setDrafts({});
        return true;
      }

      try {
        const catalog = await backendFetch<ApiActionCatalogResponse>(
          `/api/v1/agents/${agentId}/action-settings/bulk`,
          {
            method: "PATCH",
            body: JSON.stringify({ updates }),
          }
        );
        setDrafts({});
        applyAgentIntegrationsCatalogCache(agentId, catalog);
        return true;
      } catch (e) {
        let msg =
          e instanceof BackendApiError ? e.message : e instanceof Error ? e.message : "Could not save changes";
        if (e instanceof BackendApiError && e.code === "plan.action_limit") {
          msg =
            "Your plan limit is reached. Disable another Shopify action or upgrade your plan to enable more.";
        }
        onError?.(msg);
        return false;
      }
    },
    [agentId, drafts, dirtyKeys, isDirty]
  );

  return {
    resolveEnabled,
    setEnabledDraft,
    getConfigDraft,
    setConfigDraft,
    isDirty,
    changeCount,
    cancelAll,
    saveAll,
    drafts,
  };
}
