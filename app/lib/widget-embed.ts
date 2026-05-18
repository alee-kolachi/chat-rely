/**
 * Shared helpers for the embeddable ChatRely widget (`widget.js`).
 */

export function getWidgetScriptSrc(): string {
  const env = process.env.NEXT_PUBLIC_WIDGET_SCRIPT_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  return "/widget.js";
}

/** Public API origin passed to `data-chatrely-api-base`. */
export function getWidgetApiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_BACKEND_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }
  return "";
}

export function getSiteWidgetAgentKey(): string {
  return process.env.NEXT_PUBLIC_CHATRELY_SITE_AGENT_KEY?.trim() ?? "";
}

export function buildWidgetEmbedSnippet(agentKey: string, apiBase: string, scriptSrc: string): string {
  const base = apiBase.replace(/\/$/, "");
  return `<!-- ChatRely widget -->
<script
  async
  src="${scriptSrc}"
  data-chatrely-agent-key="${agentKey}"
  data-chatrely-api-base="${base}"
></script>`;
}
