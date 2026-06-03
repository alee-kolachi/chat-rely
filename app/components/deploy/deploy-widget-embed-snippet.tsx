"use client";

import { useCallback, useMemo, useState } from "react";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { getBackendBaseUrl } from "@/lib/backend-api";
import { buildWidgetEmbedSnippet, getWidgetApiBase, getWidgetScriptSrc } from "@/lib/widget-embed";
import { appButtonClassName } from "@/lib/button-styles";
import { cn } from "@/lib/utils";

export function DeployWidgetEmbedSnippet() {
  const { selectedAgent, agentsLoading, agentsError } = useDashboardAgent();
  const [copied, setCopied] = useState(false);

  const apiBase = useMemo(() => {
    const b = getWidgetApiBase() || getBackendBaseUrl().trim().replace(/\/$/, "");
    if (b) return b;
    return "https://YOUR-PUBLIC-API-ORIGIN";
  }, []);

  const scriptSrc = useMemo(() => getWidgetScriptSrc(), []);

  const snippet = useMemo(() => {
    const key = selectedAgent?.public_key?.trim();
    if (!key) return "";
    return buildWidgetEmbedSnippet(key, apiBase, scriptSrc);
  }, [selectedAgent, apiBase, scriptSrc]);

  const onCopy = useCallback(async () => {
    if (!snippet) return;
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [snippet]);

  return (
    <article className="space-y-4">
      <div>
        <h2 className="ds-app-section-title">Website embed</h2>
        <p className="ds-app-body-muted mt-1 max-w-2xl">
          Copy the snippet and paste it before{" "}
          <code className="text-ds-on-surface bg-ds-sidebar rounded px-1 py-0.5 text-xs">{"</body>"}</code> in your
          Shopify theme or site template.
        </p>
      </div>

      {agentsError ? (
        <p className="text-sm text-red-700">{agentsError}</p>
      ) : agentsLoading ? (
        <p className="text-ds-on-surface-variant text-sm">Loading agent…</p>
      ) : !selectedAgent ? (
        <p className="text-ds-on-surface-variant text-sm">Create an agent to get an embed key.</p>
      ) : !snippet ? (
        <p className="text-ds-on-surface-variant text-sm">This agent has no public key yet.</p>
      ) : (
        <div className="space-y-3">
          <div className="border-ds-outline overflow-x-auto rounded-ds-lg border bg-zinc-950/5">
            <pre className="max-h-64 min-w-0 overflow-x-auto p-4 text-left font-mono text-[11px] leading-relaxed text-zinc-800 sm:text-xs">
              {snippet}
            </pre>
          </div>
          <button
            type="button"
            onClick={() => void onCopy()}
            className={
              copied
                ? "rounded-ds-md border border-emerald-600/40 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-900"
                : appButtonClassName()
            }
          >
            {copied ? "Copied" : "Copy snippet"}
          </button>
        </div>
      )}
    </article>
  );
}
