"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { IconCheck, IconWarning, IconPlay, IconClock, IconShield } from "./action-icons";
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
};

export function ActionDetailTabs({ action }: ActionDetailTabsProps) {
  const isComingSoon = action.status === "coming-soon";
  const tabs = useMemo(
    () => (isComingSoon ? ALL_TABS.filter((tab) => tab.id !== "test") : ALL_TABS),
    [isComingSoon]
  );

  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div className="border-ds-outline rounded-ds-xl border bg-white shadow-sm">
      <div className="border-ds-outline overflow-x-auto border-b">
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
                    ? "text-ds-on-surface font-semibold"
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
        {activeTab === "overview" && <OverviewPanel action={action} />}
        {activeTab === "configuration" && <ConfigurationPanel action={action} />}
        {activeTab === "triggering" && <TriggeringPanel action={action} />}
        {activeTab === "permissions" && <PermissionsPanel action={action} />}
        {activeTab === "test" && !isComingSoon && <TestRunPanel action={action} />}
      </div>
    </div>
  );
}

function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-ds-on-surface text-sm font-bold tracking-wide">{title}</h3>
      {hint ? <p className="text-ds-on-surface-variant mt-1 text-xs">{hint}</p> : null}
    </div>
  );
}

function OverviewPanel({ action }: { action: ShopifyAction }) {
  return (
    <div className="space-y-8">
      <section>
        <SectionHeading title="What this action does" />
        <p className="text-ds-on-surface text-sm leading-relaxed">{action.longDescription}</p>
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

function ConfigurationPanel({ action }: { action: ShopifyAction }) {
  return (
    <div className="space-y-6">
      <SectionHeading
        title="Configuration"
        hint="Tune how this action behaves. Changes apply on save."
      />
      <div className="grid grid-cols-1 gap-5">
        {action.configFields.map((field) => (
          <ConfigField key={field.key} field={field} />
        ))}
      </div>
    </div>
  );
}

function ConfigField({ field }: { field: ShopifyActionConfigField }) {
  if (field.type === "text") {
    return (
      <div>
        <label className="text-ds-on-surface mb-1.5 block text-sm font-semibold">
          {field.label}
        </label>
        <input
          type="text"
          defaultValue={field.defaultValue}
          className="border-ds-outline focus:border-ds-primary w-full rounded-ds-md border bg-white px-3 py-2 text-sm outline-none"
        />
        {field.help && (
          <p className="text-ds-on-surface-variant mt-1 text-xs">{field.help}</p>
        )}
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div>
        <label className="text-ds-on-surface mb-1.5 block text-sm font-semibold">
          {field.label}
        </label>
        <input
          type="number"
          defaultValue={field.defaultValue}
          min={field.min}
          max={field.max}
          className="border-ds-outline focus:border-ds-primary w-32 rounded-ds-md border bg-white px-3 py-2 text-sm outline-none"
        />
        {field.help && (
          <p className="text-ds-on-surface-variant mt-1 text-xs">{field.help}</p>
        )}
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div>
        <label className="text-ds-on-surface mb-1.5 block text-sm font-semibold">
          {field.label}
        </label>
        <select
          defaultValue={field.defaultValue}
          className="border-ds-outline focus:border-ds-primary bg-ds-sidebar w-full max-w-sm rounded-ds-md border px-3 py-2 text-sm outline-none"
        >
          {field.options.map((opt) => (
            <option key={opt}>{opt}</option>
          ))}
        </select>
        {field.help && (
          <p className="text-ds-on-surface-variant mt-1 text-xs">{field.help}</p>
        )}
      </div>
    );
  }

  if (field.type === "multi") {
    const defaultSet = new Set(field.defaultValue);
    return (
      <div>
        <label className="text-ds-on-surface mb-1.5 block text-sm font-semibold">
          {field.label}
        </label>
        <div className="flex flex-wrap gap-2">
          {field.options.map((opt) => {
            const isOn = defaultSet.has(opt);
            return (
              <span
                key={opt}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  isOn
                    ? "border-zinc-300 bg-white text-ds-on-surface shadow-sm"
                    : "border-ds-outline bg-ds-sidebar text-ds-on-surface-variant"
                )}
              >
                {opt}
              </span>
            );
          })}
        </div>
        {field.help && (
          <p className="text-ds-on-surface-variant mt-2 text-xs">{field.help}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-ds-on-surface text-sm font-semibold">{field.label}</p>
        {field.help && (
          <p className="text-ds-on-surface-variant mt-1 text-xs">{field.help}</p>
        )}
      </div>
      <ToggleStub defaultChecked={field.defaultValue} />
    </div>
  );
}

function ToggleStub({ defaultChecked }: { defaultChecked: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => setChecked((v) => !v)}
      className={cn(
        "flex h-5 w-9 items-center rounded-full p-[2px] transition-colors",
        checked ? "bg-ds-primary" : "bg-zinc-300"
      )}
    >
      <span
        className={cn(
          "h-4 w-4 rounded-full bg-white transition-transform",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
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
        <textarea
          defaultValue={action.triggerGuidance}
          className="border-ds-outline focus:border-ds-primary bg-ds-sidebar text-ds-on-surface min-h-32 w-full rounded-ds-md border p-3 text-sm leading-relaxed outline-none"
        />
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

function PermissionsPanel({ action }: { action: ShopifyAction }) {
  const allGranted = action.scopes.every((s) => s.granted);
  return (
    <div className="space-y-6">
      <section>
        <SectionHeading
          title="Required Shopify scopes"
          hint="The agent uses these OAuth scopes when calling this action."
        />
        <div className="border-ds-outline rounded-ds-md divide-ds-outline divide-y border bg-white">
          {action.scopes.map((scope) => (
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
            One or more scopes are missing. Reconnect Shopify to grant the required permissions
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

function TestRunPanel({ action }: { action: ShopifyAction }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ latencyMs: number; output: Record<string, unknown> } | null>(
    null
  );

  function runTest() {
    setRunning(true);
    setResult(null);
    const fakeLatency = 350 + Math.floor(Math.random() * 400);
    window.setTimeout(() => {
      setResult({ latencyMs: fakeLatency, output: action.exampleOutput });
      setRunning(false);
    }, fakeLatency);
  }

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
              defaultValue={field.defaultValue}
              placeholder={field.placeholder}
              className="border-ds-outline focus:border-ds-primary w-full rounded-ds-md border bg-white px-3 py-2 text-sm outline-none"
            />
          </div>
        ))}
      </div>

      <div>
        <button
          type="button"
          onClick={runTest}
          disabled={running}
          className="bg-ds-primary text-ds-on-primary inline-flex items-center gap-2 rounded-ds-md px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <IconPlay className="size-4" />
          {running ? "Running..." : "Run test"}
        </button>
      </div>

      {result && (
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
          <pre className="bg-white p-4 text-[12px] leading-relaxed text-ds-on-surface overflow-x-auto">
            <code>{JSON.stringify(result.output, null, 2)}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
