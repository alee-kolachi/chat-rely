import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AgentSettingsGeneralPage() {
  return (
    <div className="ds-app-shell p-6 md:p-8">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <header>
          <h1 className="ds-app-page-title">Agent settings</h1>
          <p className="ds-app-page-description ds-app-page-description--wide mt-2">
            Options for the selected chatbot (agent): integrations, limits, and data retention. Escalation and human
            handoff live under{" "}
            <Link href="/actions" className="text-ds-primary font-semibold hover:underline">
              Actions & integrations
            </Link>
            .
          </p>
        </header>

        <section className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
          <h2 className="ds-app-section-title mb-2 text-base">Integrations &amp; credentials</h2>
          <p className="text-ds-on-surface-variant text-sm leading-relaxed">
            Connect Shopify and other tools from Actions & integrations. OAuth tokens are stored per agent.
          </p>
        </section>

        <section className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
          <h2 className="ds-app-section-title mb-2 flex items-center gap-2 text-base">
            <IconSpeed className="text-ds-primary size-5 shrink-0" aria-hidden />
            Rate limits
          </h2>
          <p className="text-ds-on-surface-variant mb-6 text-sm leading-relaxed">
            Throttle how many user messages this agent accepts within a rolling time window. Backend wiring will connect
            these controls to runtime behavior.
          </p>
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-8">
              <div>
                <label
                  htmlFor="agent-rate-limit-messages"
                  className="text-ds-on-surface mb-1.5 block text-sm font-semibold"
                >
                  Max messages
                </label>
                <p className="text-ds-on-surface-variant mb-2 text-xs leading-relaxed">
                  Allowed before the limit message is shown.
                </p>
                <div className="w-28">
                  <input
                    id="agent-rate-limit-messages"
                    className="ds-app-field rounded-ds-lg py-2.5 text-center tabular-nums font-semibold"
                    type="number"
                    min={1}
                    defaultValue={20}
                    readOnly
                    aria-readonly
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="agent-rate-limit-window"
                  className="text-ds-on-surface mb-1.5 block text-sm font-semibold"
                >
                  Window (seconds)
                </label>
                <p className="text-ds-on-surface-variant mb-2 text-xs leading-relaxed">
                  Rolling period the count applies to.
                </p>
                <div className="w-28">
                  <input
                    id="agent-rate-limit-window"
                    className="ds-app-field rounded-ds-lg py-2.5 text-center tabular-nums font-semibold"
                    type="number"
                    min={1}
                    defaultValue={60}
                    readOnly
                    aria-readonly
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="ds-app-kicker mb-2 block text-ds-on-surface-variant">
                Message when limit is reached
              </label>
              <textarea
                className="ds-app-field min-h-[5.5rem] rounded-ds-lg leading-relaxed"
                rows={3}
                defaultValue="Too many messages. Please try again in a bit."
                readOnly
                aria-readonly
              />
            </div>
            <div className="border-ds-outline flex justify-end gap-3 border-t pt-4">
              <button
                type="button"
                disabled
                className="text-ds-on-surface-variant cursor-not-allowed rounded-ds-lg px-5 py-2 text-sm font-semibold opacity-60"
              >
                Reset
              </button>
              <button
                type="button"
                disabled
                className="bg-ds-primary text-ds-on-primary cursor-not-allowed rounded-ds-lg px-5 py-2 text-sm font-semibold opacity-60 shadow-sm"
              >
                Save changes
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-ds-xl border border-rose-200 bg-rose-50/80 p-6">
          <h2 className="ds-app-section-title mb-2 flex items-center gap-2 text-base text-rose-900">
            <IconWarning className="size-5 shrink-0 text-rose-700" aria-hidden />
            Data &amp; conversations
          </h2>
          <p className="text-sm leading-relaxed text-rose-800/90">
            Destructive actions for this agent&apos;s stored conversations. Backend support will be added later.
          </p>
          <div className="mt-6">
            <DangerRow
              title="Clear data"
              description="Permanently remove all chat logs and history for this agent."
              action="Delete all conversations"
              icon={<IconDeleteSweep className="size-4.5 shrink-0" aria-hidden />}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function DangerRow({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action: string;
  icon: ReactNode;
}) {
  return (
    <div className="border-ds-outline flex flex-col justify-between gap-4 rounded-ds-lg border bg-ds-surface p-4 sm:flex-row sm:items-center">
      <div className="min-w-0">
        <h3 className="text-ds-on-surface text-sm font-semibold">{title}</h3>
        <p className="text-ds-on-surface-variant mt-0.5 text-xs leading-relaxed">{description}</p>
      </div>
      <button
        type="button"
        disabled
        className={cn(
          "flex cursor-not-allowed items-center justify-center gap-2 rounded-ds-lg border border-rose-200 px-5 py-2.5 text-sm font-semibold whitespace-nowrap text-rose-700 opacity-70"
        )}
      >
        {icon}
        {action}
      </button>
    </div>
  );
}

function IconSpeed({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 14a8 8 0 1 1 16 0" />
      <path d="m12 12 4-4" />
      <path d="M12 20v-2" />
    </svg>
  );
}

function IconWarning({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 3 2.8 19h18.4L12 3Z" />
      <path d="M12 9v4M12 16h.01" />
    </svg>
  );
}

function IconDeleteSweep({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 7h16M9 7V5h6v2M7 7l1 12h8l1-12" />
      <path d="m16.5 9.5 2 2 2.5-2.5" />
    </svg>
  );
}
