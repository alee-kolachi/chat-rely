"use client";

import { useCallback, useMemo, useState } from "react";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { getBackendBaseUrl } from "@/lib/backend-api";
import { buildWidgetEmbedSnippet, getWidgetApiBase, getWidgetScriptSrc } from "@/lib/widget-embed";
import { appButtonClassName } from "@/lib/button-styles";

function EmbedInstallSteps() {
  return (
    <div className="space-y-4">
      <ol className="text-ds-on-surface-variant list-decimal space-y-2 pl-5 text-sm leading-relaxed marker:font-semibold marker:text-ds-on-surface">
        <li>Copy the snippet below.</li>
        <li>
          Paste it on every page, directly above the closing{" "}
          <code className="text-ds-on-surface bg-ds-sidebar rounded px-1 py-0.5 text-xs">{"</body>"}</code>{" "}
          tag in your site template.
        </li>
        <li>Save and publish, then open your live site. The chat bubble should show in the bottom corner.</li>
      </ol>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="border-ds-outline bg-ds-sidebar/30 rounded-ds-lg border p-4">
          <h3 className="text-ds-on-surface text-sm font-semibold">Shopify</h3>
          <ol className="text-ds-on-surface-variant mt-2 list-decimal space-y-1.5 pl-4 text-sm leading-relaxed">
            <li>In Shopify admin, go to Online Store → Themes.</li>
            <li>On your live theme, click ⋯ → Edit code.</li>
            <li>Open Layout → theme.liquid.</li>
            <li>
              Paste the snippet just above{" "}
              <code className="text-ds-on-surface bg-ds-surface rounded px-1 py-0.5 text-xs">{"</body>"}</code>.
            </li>
            <li>Click Save, then open your storefront to check.</li>
          </ol>
        </div>

        <div className="border-ds-outline bg-ds-sidebar/30 rounded-ds-lg border p-4">
          <h3 className="text-ds-on-surface text-sm font-semibold">Other websites</h3>
          <ol className="text-ds-on-surface-variant mt-2 list-decimal space-y-1.5 pl-4 text-sm leading-relaxed">
            <li>Open your site&apos;s main layout file (often footer, header, or index template).</li>
            <li>
              Paste the snippet just above{" "}
              <code className="text-ds-on-surface bg-ds-surface rounded px-1 py-0.5 text-xs">{"</body>"}</code>.
            </li>
            <li>Save and deploy your site, then reload a page to check.</li>
          </ol>
        </div>
      </div>

      <p className="ds-app-body-muted text-sm">
        Widget colors and fonts in Appearance apply automatically. You do not need to update the snippet when you
        change styling.
      </p>
    </div>
  );
}

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
    <article className="space-y-5">
      <div>
        <h2 className="ds-app-section-title">Website embed</h2>
        <p className="ds-app-body-muted mt-1 max-w-2xl">
          One script tag adds the chat widget to every page on your store or site.
        </p>
      </div>

      <EmbedInstallSteps />

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
          <p className="text-ds-on-surface text-sm font-medium">Your snippet</p>
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
