"use client";

import Script from "next/script";
import { getSiteWidgetAgentKey, getWidgetApiBase, getWidgetScriptSrc } from "@/lib/widget-embed";

/**
 * Site-wide product support widget (dogfood). Renders nothing unless
 * `NEXT_PUBLIC_CHATRELY_SITE_AGENT_KEY` is set.
 */
export function ChatrelySiteWidget() {
  const agentKey = getSiteWidgetAgentKey();
  if (!agentKey) return null;

  const apiBase = getWidgetApiBase();
  if (!apiBase) return null;

  return (
    <Script
      id="chatrely-site-widget"
      async
      src={getWidgetScriptSrc()}
      strategy="afterInteractive"
      data-chatrely-agent-key={agentKey}
      data-chatrely-api-base={apiBase}
    />
  );
}
