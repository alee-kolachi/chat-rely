"use client";

import { useMemo, useState } from "react";
import { BackendApiError, backendFetch } from "@/lib/backend-api";
import { chatSseStream } from "@/lib/chat-sse";
import { appButtonClassName } from "@/lib/button-styles";
import { cn } from "@/lib/utils";
import { IconCheck, IconWarning, IconPlay, IconClock, IconShield } from "./action-icons";
import type { ApiActionCatalogEntry } from "./action-catalog-types";
import type {
  ShopifyAction,
  ShopifyActionConfigField,
} from "./shopify-actions-data";

type TabId = "overview" | "configuration" | "triggering" | "permissions" | "test";

const ALL_TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "configuration", label: "Configuration" },
  { id: "triggering", label: "Triggering" },
  { id: "permissions", label: "Permissions" },
  { id: "test", label: "Test run" },
];

type ActionDetailTabsProps = {
  action: ShopifyAction;
  /** Live catalog row — drives Permissions tab (store access scopes), not static demo flags. */
  catalogEntry?: ApiActionCatalogEntry | null;
  selectedAgentId?: string | null;
};

export function ActionDetailTabs({ action, catalogEntry, selectedAgentId }: ActionDetailTabsProps) {
  const isComingSoon = catalogEntry
    ? catalogEntry.status === "coming_soon"
    : action.status === "coming-soon";
  const tabs = useMemo(
    () => (isComingSoon ? ALL_TABS.filter((tab) => tab.id !== "test") : ALL_TABS),
    [isComingSoon]
  );

  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div className="border-ds-outline rounded-ds-xl border bg-ds-surface shadow-sm">
      <div className="border-ds-outline bg-ds-sidebar/80 overflow-x-auto border-b">
        <div className="flex min-w-max items-center gap-1 px-4 pt-3">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "text-ds-primary font-semibold"
                    : "text-ds-on-surface-variant hover:text-ds-on-surface"
                )}
              >
                {tab.label}
                {isActive && (
                  <span className="bg-ds-primary absolute right-3 bottom-0 left-3 h-0.5 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6 md:p-8">
        {activeTab === "overview" && <OverviewPanel action={action} catalogEntry={catalogEntry} />}
        {activeTab === "configuration" && (
          <ConfigurationPanel action={action} catalogEntry={catalogEntry} />
        )}
        {activeTab === "triggering" && <TriggeringPanel action={action} />}
        {activeTab === "permissions" && (
          <PermissionsPanel action={action} catalogEntry={catalogEntry} />
        )}
        {activeTab === "test" && !isComingSoon && (
          <TestRunPanel action={action} selectedAgentId={selectedAgentId} />
        )}
      </div>
    </div>
  );
}

function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4">
      <h3 className="ds-app-section-title text-sm md:text-base">{title}</h3>
      {hint ? <p className="ds-app-body-muted mt-1">{hint}</p> : null}
    </div>
  );
}

function OverviewPanel({
  action,
  catalogEntry,
}: {
  action: ShopifyAction;
  catalogEntry?: ApiActionCatalogEntry | null;
}) {
  const overviewCopy = catalogEntry?.description ?? action.description;

  return (
    <div className="space-y-8">
      <section>
        <SectionHeading title="What this action does" />
        <p className="text-ds-on-surface text-sm leading-relaxed">{overviewCopy}</p>
      </section>

      <section>
        <SectionHeading title="Example invocation" hint="What the agent sends and gets back." />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CodeBlock label="Input" json={action.exampleInput} />
          <CodeBlock label="Output" json={action.exampleOutput} />
        </div>
      </section>
    </div>
  );
}

function CodeBlock({ label, json }: { label: string; json: Record<string, unknown> }) {
  return (
    <div className="border-ds-outline rounded-ds-md overflow-hidden border">
      <div className="bg-ds-sidebar text-ds-on-surface-variant border-ds-outline border-b px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase">
        {label}
      </div>
      <pre className="bg-white p-4 text-[12px] leading-relaxed text-ds-on-surface overflow-x-auto">
        <code>{JSON.stringify(json, null, 2)}</code>
      </pre>
    </div>
  );
}

function formatConfigPreviewValue(
  field: ShopifyActionConfigField,
  catalogEntry?: ApiActionCatalogEntry | null
): string {
  const cfg = (catalogEntry?.config ?? {}) as Record<string, unknown>;
  if (field.key === "maxResults" && typeof cfg.maxResults === "number") {
    return String(cfg.maxResults);
  }
  if (field.type === "multi") {
    return field.defaultValue.join(", ");
  }
  if (field.type === "toggle") {
    return field.defaultValue ? "On" : "Off";
  }
  return String(field.defaultValue);
}

function ConfigurationPanel({
  action,
  catalogEntry,
}: {
  action: ShopifyAction;
  catalogEntry?: ApiActionCatalogEntry | null;
}) {
  const isComingSoon = catalogEntry
    ? catalogEntry.status === "coming_soon"
    : action.status === "coming-soon";
  const savedMaxResults =
    action.id === "product-search" &&
    typeof (catalogEntry?.config as Record<string, unknown> | undefined)?.maxResults ===
      "number"
      ? ((catalogEntry?.config as Record<string, unknown>).maxResults as number)
      : null;

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Configuration"
        hint="Turn the action on above to use it in chat."
      />

      <div className="border-ds-outline rounded-ds-md border bg-ds-sidebar/40 p-4 text-sm text-ds-on-surface-variant leading-relaxed">
        {isComingSoon ? (
          <p>
            Settings for this action are not available yet. Enable it above once it launches.
          </p>
        ) : action.id === "order-lookup" ? (
          <p>
            Order Lookup uses fixed behavior in chat: order number or customer email, with status
            and tracking from your Shopify store when available. Nothing on this tab is saved yet.
          </p>
        ) : action.id === "product-search" ? (
          <p>
            Product Search returns up to{" "}
            {savedMaxResults ?? 5} products per lookup in chat
            {savedMaxResults == null
              ? " (built-in default). Set maxResults on the agent action via API to change it."
              : " from your saved agent action config."}{" "}
            Other fields below are built-in defaults and are not saved from this tab yet.
          </p>
        ) : (
          <p>
            Per-action settings for Shopify tools are not saved yet. Enable the action above to use
            built-in defaults in chat.
          </p>
        )}
      </div>

      {action.configFields.length > 0 ? (
        <section>
          <p className="ds-app-kicker text-ds-on-surface-variant mb-3">Built-in defaults (preview)</p>
          <dl className="border-ds-outline divide-ds-outline divide-y rounded-ds-md border bg-white">
            {action.configFields.map((field) => (
              <div key={field.key} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                <dt className="text-ds-on-surface text-sm font-semibold">{field.label}</dt>
                <dd className="text-ds-on-surface-variant text-sm sm:text-right">
                  {formatConfigPreviewValue(field, catalogEntry)}
                  {field.help ? (
                    <span className="mt-1 block text-xs leading-relaxed">{field.help}</span>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </div>
  );
}

function TriggeringPanel({ action }: { action: ShopifyAction }) {
  return (
    <div className="space-y-6">
      <section>
        <SectionHeading
          title="When the agent should call this"
          hint="Plain-language guidance the model will follow."
        />
        <textarea defaultValue={action.triggerGuidance} className="ds-app-field min-h-32 rounded-ds-md leading-relaxed" />
      </section>

      <section>
        <SectionHeading
          title="Example user phrasings"
          hint="Helps the agent recognize when to invoke this action."
        />
        <ul className="space-y-2">
          {action.triggerExamples.map((ex) => (
            <li
              key={ex}
              className="border-ds-outline rounded-ds-md text-ds-on-surface flex items-start gap-2 border bg-white px-3 py-2 text-sm italic"
            >
              <span className="text-ds-on-surface-variant mt-0.5">&ldquo;</span>
              {ex}
              <span className="text-ds-on-surface-variant mt-0.5 ml-auto">&rdquo;</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function PermissionsPanel({
  action,
  catalogEntry,
}: {
  action: ShopifyAction;
  catalogEntry?: ApiActionCatalogEntry | null;
}) {
  const grantedSet = new Set((catalogEntry?.connection_scopes ?? []).map((s) => s.toLowerCase()))
  const requiredFromApi = catalogEntry?.required_scopes?.length
    ? catalogEntry.required_scopes
    : action.scopes.map((s) => s.name)
  const rows = requiredFromApi.map((name) => ({
    name,
    granted: grantedSet.has(name.toLowerCase()),
  }))
  const allGranted = rows.length > 0 && rows.every((r) => r.granted)

  return (
    <div className="space-y-6">
      <section>
        <SectionHeading
          title="Required store access"
          hint="Compared against permissions from your Shopify sign-in (live data)."
        />
        <div className="border-ds-outline rounded-ds-md divide-ds-outline divide-y border bg-white">
          {rows.map((scope) => (
            <div key={scope.name} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <IconShield className="text-ds-on-surface-variant size-4" />
                <span className="text-ds-on-surface font-mono text-xs">{scope.name}</span>
              </div>
              {scope.granted ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wide text-emerald-700 uppercase">
                  <IconCheck className="size-3.5" />
                  Granted
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wide text-amber-700 uppercase">
                  <IconWarning className="size-3.5" />
                  Missing
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
      {!allGranted && (
        <div className="rounded-ds-md flex items-start gap-3 border border-amber-200 bg-amber-50 p-4">
          <IconWarning className="mt-0.5 size-4 text-amber-700" />
          <div className="text-sm text-amber-900">
            One or more permissions are missing. Reconnect Shopify to grant the required access
            before enabling this action.
            <button className="ml-2 font-semibold underline-offset-2 hover:underline">
              Reconnect now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type ConversationApiMessage = {
  role: string;
  tool_name?: string | null;
  created_at?: string;
  content?: string;
};

function expectedToolNameForAction(actionId: string): string | null {
  if (actionId === "product-search") return "shopify_product_search";
  if (actionId === "order-lookup") return "shopify_order_lookup";
  if (actionId === "inventory-check") return "shopify_inventory_check";
  if (actionId === "customer-profile") return "shopify_customer_context";
  return null;
}

function formatOrderLookupTestMessage(orderNumber: string): string {
  const trimmed = orderNumber.trim();
  const display = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return `Where is order ${display}?`;
}

function buildTestMessage(action: ShopifyAction, values: Record<string, string>): string {
  if (action.id === "order-lookup") {
    const orderNumber = values.orderNumber?.trim();
    if (orderNumber) return formatOrderLookupTestMessage(orderNumber);
  }

  const lines = action.testFields
    .map((f) => values[f.key]?.trim())
    .filter((v): v is string => Boolean(v && v.length > 0));
  if (lines.length > 0) return lines.join("\n");
  return action.triggerExamples[0] ?? `Please test ${action.label.toLowerCase()}.`;
}

function findLatestToolMessageForTurn(
  messages: ConversationApiMessage[],
  testMessage: string,
  expectedTool: string | null
): ConversationApiMessage | undefined {
  let lastUserIdx = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg.role === "user" && msg.content?.trim() === testMessage.trim()) {
      lastUserIdx = i;
      break;
    }
  }
  const fromIdx = lastUserIdx >= 0 ? lastUserIdx + 1 : 0;
  for (let i = messages.length - 1; i >= fromIdx; i -= 1) {
    const msg = messages[i];
    if (msg.role !== "tool") continue;
    if (expectedTool && msg.tool_name !== expectedTool) continue;
    return msg;
  }
  return undefined;
}

function parseMaybeJson(raw: string | undefined): unknown {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

type LookupMeta = {
  not_found?: boolean;
  message?: string;
};

function extractLookupMeta(output: unknown): LookupMeta | null {
  if (!output || typeof output !== "object") return null;
  const meta = (output as Record<string, unknown>).lookup_meta;
  if (!meta || typeof meta !== "object") return null;
  return meta as LookupMeta;
}

function TestRunPanel({ action, selectedAgentId }: { action: ShopifyAction; selectedAgentId?: string | null }) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(action.testFields.map((f) => [f.key, f.defaultValue ?? ""]))
  );
  const [result, setResult] = useState<{
    latencyMs: number;
    output: unknown;
    assistantResponse: string;
    toolsInvoked: string[];
  } | null>(null);

  async function runTest() {
    if (!selectedAgentId) return;
    setRunning(true);
    setError(null);
    setResult(null);
    const started = performance.now();
    const testMessage = buildTestMessage(action, fieldValues);
    try {
      const data = {
        conversation_id: "",
        response: "",
        tools_invoked: [] as string[],
      };
      for await (const ev of chatSseStream("/api/chat/stream", {
        method: "POST",
        body: JSON.stringify({
          agent_id: selectedAgentId,
          message: testMessage,
          visitor_id: `action-test-${action.id}-${Date.now()}`,
        }),
      })) {
        if (ev.type === "done") {
          if (ev.conversation_id) data.conversation_id = ev.conversation_id;
          data.response = typeof ev.response === "string" ? ev.response : "";
          data.tools_invoked = Array.isArray(ev.tools_invoked) ? ev.tools_invoked : [];
        } else if (ev.type === "error") {
          throw new BackendApiError(ev.message ?? "Chat failed", 0, ev.code, ev.details);
        }
      }
      if (!data.conversation_id) {
        throw new Error("Stream completed without a conversation id");
      }
      const conv = await backendFetch<{ messages: ConversationApiMessage[] }>(
        `/api/v1/conversations/${data.conversation_id}`
      );
      const expectedTool = expectedToolNameForAction(action.id);
      const latestTool = findLatestToolMessageForTurn(conv.messages, testMessage, expectedTool);
      setResult({
        latencyMs: Math.round(performance.now() - started),
        output: parseMaybeJson(latestTool?.content),
        assistantResponse: data.response,
        toolsInvoked: data.tools_invoked ?? [],
      });
    } catch (e) {
      const msg =
        e instanceof BackendApiError ? e.message : e instanceof Error ? e.message : "Failed to run live test";
      setError(msg);
    } finally {
      setRunning(false);
    }
  }

  const lookupMeta = result ? extractLookupMeta(result.output) : null;

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Test run"
        hint="Send sample input to see what the agent would receive back."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {action.testFields.map((field) => (
          <div key={field.key}>
            <label className="text-ds-on-surface mb-1.5 block text-sm font-semibold">
              {field.label}
            </label>
            <input
              type="text"
              value={fieldValues[field.key] ?? ""}
              placeholder={field.placeholder}
              onChange={(e) =>
                setFieldValues((prev) => ({
                  ...prev,
                  [field.key]: e.target.value,
                }))
              }
              className="ds-app-field rounded-ds-md"
            />
          </div>
        ))}
      </div>

      <div>
        <button
          type="button"
          onClick={runTest}
          disabled={running || !selectedAgentId}
          className={appButtonClassName("default", { className: "inline-flex items-center gap-2" })}
        >
          <IconPlay className="size-4" />
          {running ? "Running..." : "Run test"}
        </button>
      </div>
      {error ? (
        <div className="border-ds-outline rounded-ds-md border bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="border-ds-outline rounded-ds-md overflow-hidden border">
          <div className="bg-ds-sidebar border-ds-outline flex items-center justify-between border-b px-3 py-2">
            <span className="text-ds-on-surface text-[10px] font-bold tracking-widest uppercase">
              Result
            </span>
            <span className="text-ds-on-surface-variant inline-flex items-center gap-1 text-[11px] font-medium">
              <IconClock className="size-3.5" />
              {result.latencyMs} ms
            </span>
          </div>
          {lookupMeta?.not_found ? (
            <div className="border-ds-outline border-b bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {lookupMeta.message ??
                "No customer record for this email in your connected store."}
            </div>
          ) : null}
          <pre className="bg-white p-4 text-[12px] leading-relaxed text-ds-on-surface overflow-x-auto">
            <code>{JSON.stringify(result.output, null, 2)}</code>
          </pre>
          <div className="border-ds-outline border-t bg-ds-sidebar/30 p-3 text-xs text-ds-on-surface-variant">
            <p>Tools invoked: {result.toolsInvoked.length ? result.toolsInvoked.join(", ") : "none"}</p>
            <p className="mt-1">Assistant: {result.assistantResponse}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
