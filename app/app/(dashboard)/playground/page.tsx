"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { onboardingType } from "@/components/onboarding/onboarding-ui";
import { backendFetch } from "@/lib/backend-api";
import { cn } from "@/lib/utils";

/** Uses global `.ds-app-field` (design-system tokens + focus ring). */
const fieldControlClass = cn("ds-app-field");

type ActionItem = {
  label: string;
  description: string;
  enabled: boolean;
  disabled?: boolean;
};

const shopifyActions: ActionItem[] = [
  {
    label: "Product Search",
    description: "Search store catalog",
    enabled: true,
  },
  {
    label: "Order Lookup",
    description: "Track and view shipments",
    enabled: true,
  },
  {
    label: "Inventory Check",
    description: "Real-time stock levels",
    enabled: false,
    disabled: true,
  },
];

export default function PlaygroundPage() {
  const [mobileTab, setMobileTab] = useState<"settings" | "preview">("settings");
  const [agents, setAgents] = useState<Array<{ id: string; name: string; model: string; system_prompt: string }>>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [previewMessages, setPreviewMessages] = useState<Array<{ from: "user" | "assistant"; text: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId) ?? null,
    [agents, selectedAgentId]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await backendFetch<{ agents: Array<{ id: string; name: string; model: string; system_prompt: string }> }>(
          "/api/v1/agents"
        );
        if (cancelled) return;
        setAgents(data.agents);
        const first = data.agents[0];
        if (first) {
          setSelectedAgentId(first.id);
          setModel(first.model || "gpt-4o-mini");
          setSystemPrompt(first.system_prompt || "");
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load agents");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    if (!selectedAgentId || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await backendFetch(`/api/v1/agents/${selectedAgentId}`, {
        method: "PATCH",
        body: JSON.stringify({ model, system_prompt: systemPrompt }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save agent settings");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSendMessage() {
    if (!selectedAgentId || !messageInput.trim() || isSending) return;
    const userMessage = messageInput.trim();
    setMessageInput("");
    setPreviewMessages((prev) => [...prev, { from: "user", text: userMessage }]);
    setIsSending(true);
    setError(null);
    try {
      const data = await backendFetch<{ conversation_id: string; response: string }>("/api/v1/runtime/chat", {
        method: "POST",
        body: JSON.stringify({
          agent_id: selectedAgentId,
          message: userMessage,
          conversation_id: conversationId,
          model_override: model,
          system_prompt_override: systemPrompt,
          visitor_id: "playground-preview",
        }),
      });
      setConversationId(data.conversation_id);
      setPreviewMessages((prev) => [...prev, { from: "assistant", text: data.response }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="onboarding-main-surface -m-6 flex h-[calc(100vh-3.5rem)] flex-col">
      <header className="border-ds-outline bg-ds-surface flex h-14 shrink-0 items-center justify-between border-b px-4 md:h-16 md:px-8">
        <div className="flex min-w-0 items-center gap-3 md:gap-4">
          <span className="text-ds-on-surface truncate text-base font-semibold tracking-tight md:text-lg">
            Playground
          </span>
          <div className="bg-ds-outline hidden h-4 w-px shrink-0 sm:block" />
          <span className={cn(onboardingType.body, "hidden min-w-0 truncate sm:block")}>
            {selectedAgent?.name ?? "No agent selected"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <button
            type="button"
            className="text-ds-on-surface-variant hover:text-ds-on-surface hover:bg-ds-outline/40 rounded-ds-md p-2 transition-colors"
            aria-label="Help"
          >
            <IconQuestion className="size-5" />
          </button>
          <button
            type="button"
            className="text-ds-on-surface-variant hover:text-ds-on-surface hover:bg-ds-outline/40 relative rounded-ds-md p-2 transition-colors"
            aria-label="Notifications"
          >
            <IconBell className="size-5" />
            <span className="bg-ds-primary border-ds-surface absolute top-1.5 right-1.5 size-2 rounded-full border-2" />
          </button>
          <div className="border-ds-outline ml-1 hidden items-center gap-3 border-l pl-3 lg:flex">
            <div className="flex items-center gap-2">
              <span className="size-2 shrink-0 animate-pulse rounded-full bg-amber-500" />
              <span className="text-ds-on-surface-variant text-[11px] font-semibold tracking-wide uppercase">
                Unsaved
              </span>
            </div>
            <button
              type="button"
              className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary inline-flex items-center justify-center rounded-ds-md px-4 py-2.5 text-xs font-semibold tracking-wide uppercase transition-colors active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45"
              onClick={handleSave}
              disabled={!selectedAgentId || isSaving}
            >
              {isSaving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </header>

      <div className="border-ds-outline bg-ds-sidebar/80 flex items-center gap-2 border-b p-2.5 xl:hidden">
        <button
          type="button"
          onClick={() => setMobileTab("settings")}
          className={cn(
            "rounded-ds-md px-3 py-2 text-xs font-semibold transition-colors",
            mobileTab === "settings"
              ? "border-ds-primary/40 text-ds-primary border bg-white shadow-sm"
              : "text-ds-on-surface-variant hover:text-ds-on-surface hover:bg-white/70"
          )}
        >
          Settings
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("preview")}
          className={cn(
            "rounded-ds-md px-3 py-2 text-xs font-semibold transition-colors",
            mobileTab === "preview"
              ? "border-ds-primary/40 text-ds-primary border bg-white shadow-sm"
              : "text-ds-on-surface-variant hover:text-ds-on-surface hover:bg-white/70"
          )}
        >
          Preview
        </button>
      </div>

      <div className="dot-grid flex min-h-0 flex-1 flex-col overflow-y-auto xl:flex-row xl:overflow-hidden">
        <section
          className={`border-ds-outline w-full shrink-0 overflow-y-auto border-b bg-white xl:w-[420px] xl:border-r xl:border-b-0 ${
            mobileTab === "settings" ? "block" : "hidden xl:block"
          }`}
        >
          <div className="border-ds-outline bg-ds-sidebar/90 sticky top-0 z-10 border-b px-5 py-4 backdrop-blur-sm sm:px-6">
            <h2 className="text-ds-on-surface flex items-center gap-2 text-sm font-semibold tracking-tight">
              <IconTune className="text-ds-primary size-4 shrink-0" aria-hidden />
              Playground settings
            </h2>
          </div>

          <div className="space-y-10 px-5 py-6 sm:px-8 sm:py-8">
            <div className="space-y-2">
              <label className={cn(onboardingType.label, "text-ds-on-surface-variant text-[11px] uppercase tracking-[0.14em]")}>
                Agent
              </label>
              <select
                className={fieldControlClass}
                value={selectedAgentId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setSelectedAgentId(nextId);
                  const match = agents.find((agent) => agent.id === nextId);
                  if (match) {
                    setModel(match.model || "gpt-4o-mini");
                    setSystemPrompt(match.system_prompt || "");
                  }
                }}
              >
                <option value="">Select agent</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className={cn(onboardingType.label, "text-ds-on-surface-variant text-[11px] uppercase tracking-[0.14em]")}>
                AI model
              </label>
              <select
                className={fieldControlClass}
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                <option value="gpt-4o-mini">GPT-4o mini</option>
                <option value="gpt-4o">GPT-4o</option>
              </select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label className={cn(onboardingType.label, "text-ds-on-surface-variant mb-0 text-[11px] uppercase tracking-[0.14em]")}>
                  Creativity
                </label>
                <button type="button" className="text-ds-on-surface-variant hover:text-ds-primary rounded-ds-md p-1 transition-colors" aria-label="About creativity">
                  <IconInfo className="size-4" />
                </button>
              </div>
              <input
                className="accent-ds-primary w-full"
                type="range"
                min="0"
                max="1"
                step="0.5"
                defaultValue="0.5"
              />
              <div className="text-ds-on-surface-variant flex justify-between text-[11px] font-medium tracking-wide">
                <span>Conservative</span>
                <span className="text-ds-on-surface font-semibold">Balanced</span>
                <span>Creative</span>
              </div>
            </div>

            <div className="space-y-4">
              <label className={cn(onboardingType.label, "text-ds-on-surface-variant text-[11px] uppercase tracking-[0.14em]")}>
                Enabled actions
              </label>
              <div className="border-ds-outline overflow-hidden rounded-ds-lg border bg-ds-surface shadow-sm">
                <div className="bg-ds-sidebar flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <IconBag className="text-ds-primary size-4 shrink-0" aria-hidden />
                    <span className="text-ds-on-surface text-sm font-semibold">Shopify actions</span>
                  </div>
                  <IconChevron className="text-ds-on-surface-variant size-4 rotate-90" aria-hidden />
                </div>
                <div className="border-ds-outline space-y-4 border-t p-4">
                  {shopifyActions.map((action) => (
                    <div
                      key={action.label}
                      className={`flex items-center justify-between ${action.disabled ? "opacity-50" : ""}`}
                    >
                      <div>
                        <p className="text-ds-on-surface text-sm font-medium">{action.label}</p>
                        <p className={cn(onboardingType.hint, "mt-0.5 text-[13px]")}>{action.description}</p>
                      </div>
                      <ToggleSwitch checked={action.enabled} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-ds-outline flex items-center justify-between rounded-ds-lg border bg-ds-surface p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <IconPersonPin className="text-ds-primary size-4 shrink-0" aria-hidden />
                  <span className="text-ds-on-surface text-sm font-semibold">Escalate to human</span>
                </div>
                <ToggleSwitch checked={false} />
              </div>
            </div>

            <div className="space-y-2">
              <label className={cn(onboardingType.label, "text-ds-on-surface-variant text-[11px] uppercase tracking-[0.14em]")}>
                Agent type
              </label>
              <select className={fieldControlClass}>
                <option>Brand Support Agent</option>
                <option>General AI Agent</option>
                <option>Customer Support Agent</option>
                <option>Custom Prompt</option>
              </select>
              <p className={onboardingType.hint}>Advanced mode: manual prompt editing enabled.</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className={cn(onboardingType.label, "text-ds-on-surface-variant mb-0 text-[11px] uppercase tracking-[0.14em]")}>
                  System prompt
                </label>
                <button
                  type="button"
                  className="text-ds-on-surface-variant hover:text-ds-primary inline-flex shrink-0 items-center gap-1.5 rounded-ds-md py-1 text-[11px] font-semibold tracking-wide uppercase transition-colors"
                >
                  <IconHistory className="size-3.5" aria-hidden />
                  Reset
                </button>
              </div>
              <textarea
                className={cn(fieldControlClass, "leading-relaxed")}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
              />
            </div>

            <p className={cn(onboardingType.hint, "pb-4 text-center lg:pb-8")}>
              Save your changes for them to take effect in the live agent.
            </p>

            <div className="border-ds-outline bg-ds-surface/95 sticky bottom-0 -mx-5 flex items-center justify-between gap-3 border-t p-4 backdrop-blur-sm sm:-mx-8 lg:hidden">
              <div className="flex min-w-0 items-center gap-2">
                <span className="size-2 shrink-0 animate-pulse rounded-full bg-amber-500" />
                <span className="text-ds-on-surface-variant truncate text-[11px] font-semibold uppercase tracking-wide">
                  Unsaved
                </span>
              </div>
              <button
                type="button"
                className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary inline-flex shrink-0 items-center justify-center rounded-ds-md px-4 py-2.5 text-xs font-semibold tracking-wide uppercase transition-colors active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45"
                onClick={handleSave}
                disabled={!selectedAgentId || isSaving}
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </section>

        <section
          className={`min-w-0 flex-1 items-center justify-center p-4 sm:p-6 xl:flex xl:p-12 ${
            mobileTab === "preview" ? "flex" : "hidden xl:flex"
          }`}
        >
          <div className="border-ds-outline flex h-[68vh] min-h-[420px] w-full max-w-xl flex-col overflow-hidden rounded-[28px] border bg-white shadow-[0_20px_55px_rgba(15,23,42,0.06)]">
            <div className="border-ds-outline bg-ds-sidebar flex items-center justify-between border-b px-5 py-3.5 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative shrink-0">
                  <div className="bg-ds-primary flex size-9 items-center justify-center rounded-lg text-ds-on-primary shadow-sm">
                    <IconBot className="size-4" aria-hidden />
                  </div>
                  <div className="border-ds-surface absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 bg-emerald-500" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-ds-on-surface truncate text-sm font-semibold tracking-tight">
                    Assistant preview
                  </h3>
                  <span className="text-emerald-700 text-xs font-medium">Live</span>
                </div>
              </div>
              <div className="text-ds-on-surface-variant flex shrink-0 items-center gap-0.5">
                <button type="button" className="hover:bg-ds-outline/50 hover:text-ds-on-surface rounded-ds-md p-2 transition-colors" aria-label="Refresh">
                  <IconRefresh className="size-4.5" />
                </button>
                <button type="button" className="hover:bg-ds-outline/50 hover:text-ds-on-surface rounded-ds-md p-2 transition-colors" aria-label="More">
                  <IconMore className="size-4.5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-8">
              {previewMessages.length === 0 ? (
                <p className={cn(onboardingType.body, "text-center")}>Send a message to test this agent.</p>
              ) : null}
              {previewMessages.map((msg, index) => (
                <div key={`${msg.from}-${index}`} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.from === "assistant" ? (
                    <div className="flex max-w-[90%] gap-3">
                      <div className="border-ds-outline flex size-7 shrink-0 items-center justify-center rounded-full border bg-white shadow-sm">
                        <IconBot className="text-ds-on-surface-variant size-3.5" aria-hidden />
                      </div>
                      <div className="border-ds-outline text-ds-on-surface rounded-2xl rounded-tl-none border bg-white px-4 py-3 text-sm leading-relaxed shadow-sm sm:px-5">
                        {msg.text}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-ds-primary text-ds-on-primary max-w-[85%] rounded-2xl rounded-tr-none px-4 py-3 text-sm leading-relaxed shadow-sm sm:px-5">
                      {msg.text}
                    </div>
                  )}
                </div>
              ))}
              {isSending ? <p className={cn(onboardingType.hint, "italic")}>Thinking…</p> : null}
            </div>

            <div className="border-ds-outline border-t bg-ds-surface p-4 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-3">
                <button type="button" className="text-ds-on-surface-variant hover:text-ds-on-surface hover:bg-ds-outline/40 shrink-0 rounded-ds-md p-2 transition-colors" aria-label="Attach">
                  <IconAttach className="size-5" />
                </button>
                <input
                  className={cn(fieldControlClass, "min-w-0 flex-1 sm:px-5")}
                  placeholder="Test your agent…"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                />
                <button
                  type="button"
                  className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary shrink-0 rounded-ds-md p-3 transition-colors active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
                  onClick={handleSendMessage}
                  disabled={!selectedAgentId || isSending || !messageInput.trim()}
                  aria-label="Send"
                >
                  <IconSend className="size-4.5" />
                </button>
              </div>
              {error ? <p className="text-rose-600 mt-2 text-sm">{error}</p> : null}
              <p className={cn(onboardingType.hint, "mt-3 text-center")}>
                Session: <span className="text-ds-on-surface font-medium">{model}</span>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ToggleSwitch({ checked }: { checked: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      className={cn(
        "flex h-5 w-9 items-center rounded-full p-0.5 transition-colors",
        checked ? "bg-ds-primary" : "bg-ds-outline"
      )}
    >
      <span
        className={`h-4 w-4 rounded-full bg-white transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function IconBase({
  className,
  children,
  fill = "none",
  strokeWidth = "1.8",
}: {
  className?: string;
  children: ReactNode;
  fill?: string;
  strokeWidth?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

function IconQuestion({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 4 2c-.7.6-1.5 1.1-1.5 2" />
      <circle cx="12" cy="16.5" r="0.6" fill="currentColor" strokeWidth="0" />
    </IconBase>
  );
}

function IconBell({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M6 10a6 6 0 0 1 12 0v5l1.5 2h-15L6 15v-5Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </IconBase>
  );
}

function IconTune({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 7h8M16 7h4M9 7v10M4 17h4M12 17h8M15 17V7" />
    </IconBase>
  );
}

function IconInfo({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6M12 7.5h.01" />
    </IconBase>
  );
}

function IconBag({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M6 8h12l-1 11H7L6 8Z" />
      <path d="M9 9V7a3 3 0 1 1 6 0v2" />
    </IconBase>
  );
}

function IconChevron({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="m9 18 6-6-6-6" />
    </IconBase>
  );
}

function IconPersonPin({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="8.5" r="3" />
      <path d="M6 18c1.4-2.5 3.5-3.8 6-3.8s4.6 1.3 6 3.8" />
    </IconBase>
  );
}

function IconHistory({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 12a8 8 0 1 0 2.4-5.7" />
      <path d="M4 4v4h4" />
      <path d="M12 8v5l3 2" />
    </IconBase>
  );
}

function IconBot({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="5" y="7" width="14" height="11" rx="3" />
      <circle cx="10" cy="12" r="1" fill="currentColor" strokeWidth="0" />
      <circle cx="14" cy="12" r="1" fill="currentColor" strokeWidth="0" />
      <path d="M12 4v3M9 16h6" />
    </IconBase>
  );
}

function IconRefresh({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
      <path d="M20 4v5h-5" />
    </IconBase>
  );
}

function IconMore({ className }: { className?: string }) {
  return (
    <IconBase className={className} fill="currentColor" strokeWidth="0">
      <circle cx="12" cy="5" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="12" cy="19" r="1.7" />
    </IconBase>
  );
}

function IconAttach({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M16 7.5v8a4 4 0 1 1-8 0V7a3 3 0 1 1 6 0v8.5a2 2 0 1 1-4 0V9" />
    </IconBase>
  );
}

function IconSend({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M21 3 9 15" />
      <path d="m21 3-7 18-5-6-6-5 18-7Z" />
    </IconBase>
  );
}
