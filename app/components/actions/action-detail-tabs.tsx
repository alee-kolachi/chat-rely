"use client";

import { useMemo, useState } from "react";
import { BackendApiError, backendFetch } from "@/lib/backend-api";
import { clientChatContext } from "@/lib/client-context";
import { chatSseStream } from "@/lib/chat-sse";
import { appButtonClassName } from "@/lib/button-styles";
import { cn } from "@/lib/utils";
import { ActionToggle } from "./action-toggle";
import { IconCheck, IconWarning, IconPlay, IconClock, IconShield } from "./action-icons";
import type { ApiActionCatalogEntry } from "./action-catalog-types";
import type {
  ShopifyAction,
  ShopifyActionConfigField,
} from "./shopify-actions-data";

type TabId = "overview" | "configuration" | "permissions" | "test";

const ALL_TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "configuration", label: "Configuration" },
  { id: "permissions", label: "Permissions" },
  { id: "test", label: "Test run" },
];

type ActionDetailTabsProps = {
  action: ShopifyAction;
  /** Live catalog row — drives Permissions tab (store access scopes), not static demo flags. */
  catalogEntry?: ApiActionCatalogEntry | null;
  selectedAgentId?: string | null;
  config: Record<string, unknown>;
  serverConfig: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
  shopifyConnected: boolean;
  scopesSatisfied: boolean;
  actionEnabledOnServer: boolean;
  hasUnsavedEnableChange: boolean;
  hasUnsavedConfigChange: boolean;
  runtimeActive: boolean;
  reconnectBusy?: boolean;
  onReconnectShopify: () => void | Promise<void>;
};

export function ActionDetailTabs({
  action,
  catalogEntry,
  selectedAgentId,
  config,
  serverConfig,
  onConfigChange,
  shopifyConnected,
  scopesSatisfied,
  actionEnabledOnServer,
  hasUnsavedEnableChange,
  hasUnsavedConfigChange,
  runtimeActive,
  reconnectBusy = false,
  onReconnectShopify,
}: ActionDetailTabsProps) {
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

      <div className="p-4 sm:p-6 md:p-8">
        {activeTab === "overview" && <OverviewPanel action={action} catalogEntry={catalogEntry} />}
        {activeTab === "configuration" && (
          <ConfigurationPanel
            action={action}
            catalogEntry={catalogEntry}
            config={config}
            serverConfig={serverConfig}
            onConfigChange={onConfigChange}
          />
        )}
        {activeTab === "permissions" && (
          <PermissionsPanel
            action={action}
            catalogEntry={catalogEntry}
            shopifyConnected={shopifyConnected}
            reconnectBusy={reconnectBusy}
            onReconnectShopify={onReconnectShopify}
          />
        )}
        {activeTab === "test" && !isComingSoon && (
          <TestRunPanel
            action={action}
            selectedAgentId={selectedAgentId}
            shopifyConnected={shopifyConnected}
            scopesSatisfied={scopesSatisfied}
            actionEnabledOnServer={actionEnabledOnServer}
            hasUnsavedEnableChange={hasUnsavedEnableChange}
            hasUnsavedConfigChange={hasUnsavedConfigChange}
            runtimeActive={runtimeActive}
          />
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

function configValuesEqual(
  field: ShopifyActionConfigField,
  a: unknown,
  b: unknown
): boolean {
  if (field.type === "multi") {
    const norm = (v: unknown) =>
      Array.isArray(v) ? [...v].map(String).sort().join(",") : "";
    return norm(a) === norm(b);
  }
  if (field.type === "toggle") {
    return Boolean(a) === Boolean(b);
  }
  if (field.type === "number") {
    const na = typeof a === "number" ? a : Number(a);
    const nb = typeof b === "number" ? b : Number(b);
    return na === nb;
  }
  return String(a ?? "") === String(b ?? "");
}

function resolveConfigFieldValue(
  field: ShopifyActionConfigField,
  config: Record<string, unknown>
): string | number | boolean | string[] {
  const raw = config[field.key];
  if (raw === undefined) return field.defaultValue;
  if (field.type === "number") {
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(n)) return field.defaultValue;
    const min = field.min ?? Number.NEGATIVE_INFINITY;
    const max = field.max ?? Number.POSITIVE_INFINITY;
    return Math.min(max, Math.max(min, n));
  }
  if (field.type === "toggle") return Boolean(raw);
  if (field.type === "multi") {
    if (!Array.isArray(raw)) return field.defaultValue;
    return raw.map(String).filter((v) => field.options.includes(v));
  }
  if (field.type === "select") {
    const s = String(raw);
    return field.options.includes(s) ? s : field.defaultValue;
  }
  return String(raw);
}

function applyConfigFieldUpdate(
  field: ShopifyActionConfigField,
  config: Record<string, unknown>,
  serverConfig: Record<string, unknown>,
  value: string | number | boolean | string[]
): Record<string, unknown> {
  const next = { ...config };
  const serverHasKey = Object.prototype.hasOwnProperty.call(serverConfig, field.key);
  const matchesDefault = configValuesEqual(field, value, field.defaultValue);
  const matchesServer =
    serverHasKey && configValuesEqual(field, value, serverConfig[field.key]);

  if (!serverHasKey && matchesDefault) {
    delete next[field.key];
  } else if (matchesServer) {
    delete next[field.key];
  } else {
    next[field.key] = value;
  }
  return next;
}

function ConfigFieldEditor({
  field,
  value,
  disabled,
  onChange,
}: {
  field: ShopifyActionConfigField;
  value: string | number | boolean | string[];
  disabled: boolean;
  onChange: (value: string | number | boolean | string[]) => void;
}) {
  if (field.type === "toggle") {
    return (
      <ActionToggle
        checked={Boolean(value)}
        disabled={disabled}
        onChange={(next) => onChange(next)}
        size="md"
        label={field.label}
      />
    );
  }

  if (field.type === "number") {
    return (
      <input
        type="number"
        value={typeof value === "number" ? value : Number(value)}
        min={field.min}
        max={field.max}
        disabled={disabled}
        onChange={(e) => {
          const parsed = Number(e.target.value);
          if (!Number.isFinite(parsed)) return;
          onChange(parsed);
        }}
        className="ds-app-field rounded-ds-md max-w-[10rem]"
      />
    );
  }

  if (field.type === "select") {
    return (
      <select
        value={String(value)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="ds-app-field rounded-ds-md max-w-xs"
      >
        {field.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "multi") {
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <div className="flex flex-wrap gap-2">
        {field.options.map((option) => {
          const checked = selected.includes(option);
          return (
            <label
              key={option}
              className={cn(
                "border-ds-outline inline-flex cursor-pointer items-center gap-2 rounded-ds-md border px-3 py-2 text-sm",
                disabled && "cursor-not-allowed opacity-60"
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => {
                  const next = checked
                    ? selected.filter((v) => v !== option)
                    : [...selected, option];
                  onChange(next);
                }}
              />
              <span>{option}</span>
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <input
      type="text"
      value={String(value)}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="ds-app-field rounded-ds-md"
    />
  );
}

function ConfigurationPanel({
  action,
  catalogEntry,
  config,
  serverConfig,
  onConfigChange,
}: {
  action: ShopifyAction;
  catalogEntry?: ApiActionCatalogEntry | null;
  config: Record<string, unknown>;
  serverConfig: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
}) {
  const isComingSoon = catalogEntry
    ? catalogEntry.status === "coming_soon"
    : action.status === "coming-soon";
  const fieldsDisabled = isComingSoon;
  const mergedConfig = useMemo(
    () => ({ ...serverConfig, ...config }),
    [serverConfig, config]
  );

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Configuration"
        hint="Saved per agent. Use the bar at the bottom of the page to apply changes."
      />

      {isComingSoon ? (
        <div className="border-ds-outline rounded-ds-md border bg-ds-sidebar/40 p-4 text-sm text-ds-on-surface-variant leading-relaxed">
          <p>Settings for this action are not available yet. Enable it above once it launches.</p>
        </div>
      ) : action.id === "order-lookup" ? (
        <div className="border-ds-outline rounded-ds-md border bg-ds-sidebar/40 p-4 text-sm text-ds-on-surface-variant leading-relaxed">
          <p>
            Order Lookup uses fixed behavior in chat: order number or customer email, with status
            and tracking from your Shopify store when available.
          </p>
        </div>
      ) : null}

      {action.configFields.length > 0 ? (
        <section className="space-y-4">
          {action.configFields.map((field) => {
            const value = resolveConfigFieldValue(field, mergedConfig);
            return (
              <div
                key={field.key}
                className="border-ds-outline rounded-ds-md flex flex-col gap-3 border bg-white px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-ds-on-surface text-sm font-semibold">{field.label}</p>
                  {field.help ? (
                    <p className="text-ds-on-surface-variant mt-1 text-xs leading-relaxed">
                      {field.help}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 sm:pt-0.5">
                  <ConfigFieldEditor
                    field={field}
                    value={value}
                    disabled={fieldsDisabled}
                    onChange={(next) =>
                      onConfigChange(
                        applyConfigFieldUpdate(field, mergedConfig, serverConfig, next)
                      )
                    }
                  />
                </div>
              </div>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}

function PermissionsPanel({
  action,
  catalogEntry,
  shopifyConnected,
  reconnectBusy,
  onReconnectShopify,
}: {
  action: ShopifyAction;
  catalogEntry?: ApiActionCatalogEntry | null;
  shopifyConnected: boolean;
  reconnectBusy?: boolean;
  onReconnectShopify: () => void | Promise<void>;
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
            {shopifyConnected ? (
              <p>
                One or more permissions are missing. Reconnect Shopify to grant the required access
                before enabling this action.
              </p>
            ) : (
              <p>
                Connect Shopify first, then grant the required store access before enabling this
                action.
              </p>
            )}
            <button
              type="button"
              disabled={reconnectBusy}
              onClick={() => void onReconnectShopify()}
              className="text-ds-primary mt-2 inline-flex font-semibold underline-offset-2 hover:underline disabled:opacity-50"
            >
              {reconnectBusy
                ? "Opening Shopify…"
                : shopifyConnected
                  ? "Reconnect now"
                  : "Connect Shopify"}
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
  if (action.id === "product-search") {
    const query = values.query?.trim();
    if (query) return `Do you have ${query}?`;
  }
  if (action.id === "customer-profile") {
    const email = values.email?.trim();
    if (email) return `Can you look up my account and recent orders for ${email}?`;
  }
  if (action.id === "inventory-check") {
    const sku = values.sku?.trim();
    if (sku) return `How many ${sku} do you have in stock?`;
  }

  const lines = action.testFields
    .map((f) => values[f.key]?.trim())
    .filter((v): v is string => Boolean(v && v.length > 0));
  if (lines.length > 0) return lines.join("\n");
  return action.triggerExamples[0] ?? `Please test ${action.label.toLowerCase()}.`;
}

function testRunBlockers({
  selectedAgentId,
  shopifyConnected,
  scopesSatisfied,
  actionEnabledOnServer,
  hasUnsavedEnableChange,
  hasUnsavedConfigChange,
  runtimeActive,
}: {
  selectedAgentId?: string | null;
  shopifyConnected: boolean;
  scopesSatisfied: boolean;
  actionEnabledOnServer: boolean;
  hasUnsavedEnableChange: boolean;
  hasUnsavedConfigChange: boolean;
  runtimeActive: boolean;
}): string[] {
  const blockers: string[] = [];
  if (!selectedAgentId) blockers.push("Select an agent in the header.");
  if (!shopifyConnected) blockers.push("Connect Shopify for this agent.");
  if (!scopesSatisfied) blockers.push("Grant the required store access on the Permissions tab.");
  if (!actionEnabledOnServer) {
    blockers.push("Enable this action above and save your changes.");
  } else if (hasUnsavedEnableChange) {
    blockers.push("Save your enable/disable change before running a test.");
  }
  if (hasUnsavedConfigChange) {
    blockers.push("Save configuration changes before running a test.");
  }
  if (actionEnabledOnServer && !runtimeActive) {
    blockers.push(
      "This action is enabled in settings but inactive on your plan. Disable another Shopify action or upgrade."
    );
  }
  return blockers;
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

function TestRunPanel({
  action,
  selectedAgentId,
  shopifyConnected,
  scopesSatisfied,
  actionEnabledOnServer,
  hasUnsavedEnableChange,
  hasUnsavedConfigChange,
  runtimeActive,
}: {
  action: ShopifyAction;
  selectedAgentId?: string | null;
  shopifyConnected: boolean;
  scopesSatisfied: boolean;
  actionEnabledOnServer: boolean;
  hasUnsavedEnableChange: boolean;
  hasUnsavedConfigChange: boolean;
  runtimeActive: boolean;
}) {
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

  const blockers = testRunBlockers({
    selectedAgentId,
    shopifyConnected,
    scopesSatisfied,
    actionEnabledOnServer,
    hasUnsavedEnableChange,
    hasUnsavedConfigChange,
    runtimeActive,
  });
  const canRunTest = blockers.length === 0;

  async function runTest() {
    if (!canRunTest) return;
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
          ...clientChatContext(),
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
      const toolsInvoked = data.tools_invoked ?? [];
      if (expectedTool && !latestTool && !toolsInvoked.includes(expectedTool)) {
        throw new Error(
          `The agent did not call ${expectedTool}. Confirm the action is enabled, saved, and granted store access, then try a more specific test message.`
        );
      }
      setResult({
        latencyMs: Math.round(performance.now() - started),
        output: latestTool ? parseMaybeJson(latestTool.content) : { note: "No tool payload returned." },
        assistantResponse: data.response,
        toolsInvoked,
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
        hint="Runs a live chat turn against your connected store using saved action settings."
      />
      {blockers.length > 0 ? (
        <div className="rounded-ds-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Before you can test</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {blockers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
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
          disabled={running || !canRunTest}
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
