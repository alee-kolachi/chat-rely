"use client";

import type { ReactNode } from "react";
import { useState } from "react";

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

  return (
    <div className="-m-6 flex h-[calc(100vh-3.5rem)] flex-col bg-ds-surface">
      <header className="border-ds-outline flex h-16 shrink-0 items-center justify-between border-b px-4 md:px-8">
        <div className="flex items-center gap-4">
          <span className="text-ds-on-surface text-lg font-black tracking-tight uppercase">
            Playground
          </span>
          <div className="bg-ds-outline hidden h-4 w-px sm:block" />
          <span className="text-ds-on-surface-variant hidden text-sm sm:block">New Assistant Draft</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="text-ds-on-surface-variant hover:text-ds-on-surface rounded-ds-md p-2 transition-colors">
            <IconQuestion className="size-5" />
          </button>
          <button className="text-ds-on-surface-variant hover:text-ds-on-surface relative rounded-ds-md p-2 transition-colors">
            <IconBell className="size-5" />
            <span className="bg-ds-primary border-ds-surface absolute top-1.5 right-1.5 h-2 w-2 rounded-full border-2" />
          </button>
          <div className="ml-2 hidden items-center gap-3 lg:flex">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />
              <span className="text-[10px] font-bold tracking-wider text-orange-500 uppercase">
                Unsaved Changes
              </span>
            </div>
            <button className="bg-ds-primary text-ds-on-primary rounded-ds-md px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-90">
              Save Changes
            </button>
          </div>
        </div>
      </header>

      <div className="border-ds-outline bg-ds-sidebar/50 flex items-center gap-2 border-b p-3 xl:hidden">
        <button
          type="button"
          onClick={() => setMobileTab("settings")}
          className={`rounded-ds-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            mobileTab === "settings"
              ? "border border-zinc-300 bg-white text-ds-on-surface shadow-sm"
              : "text-ds-on-surface-variant hover:text-ds-on-surface"
          }`}
        >
          Settings
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("preview")}
          className={`rounded-ds-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            mobileTab === "preview"
              ? "border border-zinc-300 bg-white text-ds-on-surface shadow-sm"
              : "text-ds-on-surface-variant hover:text-ds-on-surface"
          }`}
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
          <div className="border-ds-outline sticky top-0 z-10 border-b bg-white px-6 py-5">
            <h2 className="text-ds-on-surface flex items-center gap-2 text-sm font-bold tracking-[0.14em] uppercase">
              <IconTune className="size-4" />
              Playground Settings
            </h2>
          </div>

          <div className="space-y-10 px-5 py-6 sm:px-8 sm:py-8">
            <div className="space-y-3">
              <label className="text-ds-on-surface-variant text-[11px] font-bold tracking-[0.16em] uppercase">
                AI Model
              </label>
              <select className="border-ds-outline bg-ds-sidebar text-ds-on-surface w-full rounded-ds-md border px-4 py-3 text-sm outline-none focus:border-black">
                <option>GPT-4o (Omni)</option>
                <option>GPT-4 Turbo</option>
                <option>Claude 3.5 Sonnet</option>
                <option>Claude 3 Opus</option>
                <option>Llama 3 (70b)</option>
              </select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <label className="text-ds-on-surface-variant text-[11px] font-bold tracking-[0.16em] uppercase">
                  Creativity Level
                </label>
                <IconInfo className="text-ds-on-surface-variant size-4" />
              </div>
              <input
                className="accent-ds-primary w-full"
                type="range"
                min="0"
                max="1"
                step="0.5"
                defaultValue="0.5"
              />
              <div className="text-ds-on-surface-variant flex justify-between text-[10px] font-bold tracking-wide uppercase">
                <span>Conservative</span>
                <span className="text-ds-on-surface">Balanced</span>
                <span>Creative</span>
              </div>
            </div>

            <div className="space-y-5">
              <label className="text-ds-on-surface-variant text-[11px] font-bold tracking-[0.16em] uppercase">
                Enabled Actions
              </label>
              <div className="border-ds-outline overflow-hidden rounded-ds-lg border bg-white shadow-sm">
                <div className="bg-ds-sidebar flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <IconBag className="size-4" />
                    <span className="text-ds-on-surface text-sm font-semibold">Shopify Actions</span>
                  </div>
                  <IconChevron className="text-ds-on-surface-variant size-4 rotate-90" />
                </div>
                <div className="space-y-4 border-t border-zinc-100 p-4">
                  {shopifyActions.map((action) => (
                    <div
                      key={action.label}
                      className={`flex items-center justify-between ${action.disabled ? "opacity-50" : ""}`}
                    >
                      <div>
                        <p className="text-ds-on-surface text-xs font-semibold">{action.label}</p>
                        <p className="text-ds-on-surface-variant text-[11px]">{action.description}</p>
                      </div>
                      <ToggleSwitch checked={action.enabled} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-ds-outline flex items-center justify-between rounded-ds-lg border bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <IconPersonPin className="size-4" />
                  <span className="text-ds-on-surface text-sm font-semibold">Escalate to Human</span>
                </div>
                <ToggleSwitch checked={false} />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-ds-on-surface-variant text-[11px] font-bold tracking-[0.16em] uppercase">
                Agent Type
              </label>
              <select className="border-ds-outline bg-ds-sidebar text-ds-on-surface w-full rounded-ds-md border px-4 py-3 text-sm outline-none focus:border-black">
                <option>Brand Support Agent</option>
                <option>General AI Agent</option>
                <option>Customer Support Agent</option>
                <option>Custom Prompt</option>
              </select>
              <p className="text-ds-on-surface-variant text-[10px] font-medium">
                Advanced mode: Manual prompt editing enabled.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-ds-on-surface-variant text-[11px] font-bold tracking-[0.16em] uppercase">
                  System Prompt
                </label>
                <button className="text-ds-on-surface-variant hover:text-ds-on-surface flex items-center gap-1 text-[10px] font-bold tracking-[0.12em] uppercase">
                  <IconHistory className="size-3.5" />
                  Reset to Default
                </button>
              </div>
              <textarea
                className="border-ds-outline bg-ds-sidebar text-ds-on-surface min-h-40 w-full rounded-ds-md border p-4 text-sm leading-relaxed outline-none focus:border-black"
                defaultValue="You are a professional AI assistant designed to help users manage their Shopify storefront. Your tone is helpful, concise, and professional. Use the provided tools to lookup orders and products accurately."
              />
            </div>

            <p className="text-ds-on-surface-variant pb-8 text-center text-[10px] font-bold tracking-[0.16em] uppercase">
              Changes must be saved manually to take effect.
            </p>
          </div>
        </section>

        <section
          className={`min-w-0 flex-1 items-center justify-center p-4 sm:p-6 xl:flex xl:p-12 ${
            mobileTab === "preview" ? "flex" : "hidden xl:flex"
          }`}
        >
          <div className="border-ds-outline flex h-[68vh] min-h-[420px] w-full max-w-xl flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl shadow-zinc-900/5">
            <div className="border-ds-outline flex items-center justify-between border-b px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="bg-ds-primary flex size-9 items-center justify-center rounded-lg">
                    <IconBot className="text-ds-on-primary size-4" />
                  </div>
                  <div className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                </div>
                <div>
                  <h3 className="text-ds-on-surface text-xs font-black tracking-tight uppercase">
                    Assistant Preview
                  </h3>
                  <span className="text-[9px] font-bold tracking-[0.15em] text-emerald-600 uppercase">
                    Live
                  </span>
                </div>
              </div>
              <div className="text-ds-on-surface-variant flex items-center gap-1">
                <button className="hover:text-ds-on-surface rounded-ds-md p-2 transition-colors">
                  <IconRefresh className="size-4.5" />
                </button>
                <button className="hover:text-ds-on-surface rounded-ds-md p-2 transition-colors">
                  <IconMore className="size-4.5" />
                </button>
              </div>
            </div>

            <div className="bg-ds-sidebar/40 min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-8">
              <div className="flex justify-end">
                <div className="bg-ds-primary text-ds-on-primary max-w-[85%] rounded-2xl rounded-tr-none px-5 py-3 text-sm">
                  What is the status of order #8842?
                </div>
              </div>

              <div className="flex justify-start">
                <div className="flex max-w-[90%] gap-3">
                  <div className="border-ds-outline flex size-7 shrink-0 items-center justify-center rounded-full border bg-white">
                    <IconBot className="size-3.5" />
                  </div>
                  <div className="space-y-2">
                    <div className="border-ds-outline text-ds-on-surface rounded-2xl rounded-tl-none border bg-white px-5 py-3 text-sm leading-relaxed shadow-sm">
                      Checking the Shopify database...
                      <br />
                      <br />
                      Order #8842 was shipped on Monday via FedEx. It is currently in transit and
                      scheduled for delivery tomorrow by 5:00 PM.
                    </div>
                    <span className="text-ds-on-surface-variant ml-1 text-[9px] font-bold tracking-wide uppercase">
                      Sent 1m ago
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-start">
                <div className="flex max-w-[90%] gap-3">
                  <div className="border-ds-outline flex size-7 shrink-0 items-center justify-center rounded-full border bg-white">
                    <IconBot className="size-3.5" />
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-300" />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-300 [animation-delay:0.2s]" />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-300 [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-ds-outline border-t bg-white p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <button className="text-ds-on-surface-variant hover:text-ds-on-surface p-2 transition-colors">
                  <IconAttach className="size-5" />
                </button>
                <input
                  className="border-ds-outline bg-ds-sidebar focus:border-ds-primary w-full rounded-xl border px-5 py-3 text-sm outline-none transition-colors"
                  placeholder="Test your agent..."
                />
                <button className="bg-ds-primary text-ds-on-primary rounded-xl p-3 transition-opacity hover:opacity-90">
                  <IconSend className="size-4.5" />
                </button>
              </div>
              <p className="text-ds-on-surface-variant mt-4 text-center text-[9px] font-bold tracking-[0.2em] uppercase">
                Running <span className="text-ds-on-surface">GPT-4o</span> session
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
      className={`flex h-5 w-9 items-center rounded-full p-[2px] transition-colors ${
        checked ? "bg-ds-primary" : "bg-zinc-300"
      }`}
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
