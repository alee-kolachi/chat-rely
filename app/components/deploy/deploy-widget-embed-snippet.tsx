"use client";

import { useCallback, useMemo, useState } from "react";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { getBackendBaseUrl } from "@/lib/backend-api";
import { buildWidgetEmbedSnippet, getWidgetApiBase, getWidgetScriptSrc } from "@/lib/widget-embed";
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
    <article className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
      <h2 className="ds-app-section-title mb-2">Website embed</h2>
      <p className="text-ds-on-surface-variant mb-4 text-sm leading-relaxed">
        Paste this on any site or in your Shopify theme (before <code className="text-ds-on-surface">{"</body>"}</code>
        ). The <code className="text-ds-on-surface">data-chatrely-api-base</code> must be the public URL of this API
        (not a private Docker hostname). Build the bundle with{" "}
        <code className="text-ds-on-surface">cd widget &amp;&amp; npm install &amp;&amp; npm run build</code>, then host{" "}
        <code className="text-ds-on-surface">widget/dist/widget.js</code> and point <code className="text-ds-on-surface">src</code>{" "}
        there.
      </p>

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
          <div className="border-ds-outline overflow-hidden rounded-ds-lg border bg-zinc-950/5">
            <pre className="max-h-64 overflow-auto p-4 text-left font-mono text-[11px] leading-relaxed text-zinc-800 sm:text-xs">
              {snippet}
            </pre>
          </div>
          <button
            type="button"
            onClick={() => void onCopy()}
            className={cn(
              "rounded-ds-md px-4 py-2.5 text-sm font-semibold transition-colors",
              copied
                ? "border border-emerald-600/40 bg-emerald-50 text-emerald-900"
                : "bg-ds-primary text-ds-on-primary hover:bg-ds-primary-hover"
            )}
          >
            {copied ? "Copied" : "Copy snippet"}
          </button>
        </div>
      )}
    </article>
  );
}
