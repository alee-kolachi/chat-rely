import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const notificationOptions = [
  {
    title: "Receive email with daily leads",
    description: "Get a summary of all collected lead information once per day.",
    checked: true,
  },
  {
    title: "Receive email with daily conversations",
    description: "A full report of all interactions your chatbot had today.",
    checked: false,
  },
];

export default function SettingsGeneralPage() {
  return (
    <div className="ds-app-shell p-6 md:p-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-10">
          <h1 className="ds-app-page-title">General</h1>
          <p className="ds-app-page-description ds-app-page-description--wide mt-2">
            Account preferences and workspace configuration.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6">
          <section className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
              <div className="min-w-0 lg:border-r lg:border-ds-outline lg:pr-10">
                <h2 className="ds-app-section-title mb-6 flex items-center gap-2 text-base">
                  <IconUser className="text-ds-primary size-5 shrink-0" aria-hidden />
                  Profile
                </h2>
                <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-[auto_1fr]">
                  <div className="group relative mx-auto shrink-0 sm:mx-0">
                    <div className="border-ds-outline bg-ds-sidebar relative flex size-20 items-center justify-center overflow-hidden rounded-ds-lg border-2">
                      <div className="text-ds-on-surface-variant text-xs font-semibold">AH</div>
                      <div className="absolute inset-0 flex cursor-pointer items-center justify-center bg-ds-on-surface/45 opacity-0 transition-opacity group-hover:opacity-100">
                        <IconCamera className="text-ds-on-primary size-5" aria-hidden />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-ds-primary mt-2 block w-full text-center text-[11px] font-semibold tracking-wide uppercase hover:underline"
                    >
                      Change photo
                    </button>
                  </div>
                  <div className="min-w-0">
                    <label className="ds-app-kicker mb-2 block text-ds-on-surface-variant">Full name</label>
                    <input className="ds-app-field rounded-ds-lg" type="text" defaultValue="Alexander Hamilton" />
                    <p className="text-ds-on-surface-variant mt-2 text-xs leading-relaxed">
                      Shown on your profile and in notifications.
                    </p>
                  </div>
                </div>
              </div>

              <div className="min-w-0 border-t border-ds-outline pt-8 lg:border-t-0 lg:pt-0 lg:pl-10">
                <h2 className="ds-app-section-title mb-6 flex items-center gap-2 text-base">
                  <IconMail className="text-ds-primary size-5 shrink-0" aria-hidden />
                  Email
                </h2>
                <label className="ds-app-kicker mb-2 block text-ds-on-surface-variant">Current email</label>
                <div className="flex flex-col gap-3">
                  <input
                    className="ds-app-field text-ds-on-surface-variant w-full cursor-not-allowed rounded-ds-lg bg-ds-sidebar/80"
                    type="email"
                    readOnly
                    value="alex.hamilton@example.com"
                  />
                  <button
                    type="button"
                    className="border-ds-outline text-ds-primary hover:bg-ds-primary/8 w-full rounded-ds-lg border bg-transparent px-4 py-2.5 text-sm font-semibold transition-colors sm:w-auto sm:self-start"
                  >
                    Change
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
            <h2 className="ds-app-section-title mb-2 flex items-center gap-2 text-base">
              <IconSpeed className="text-ds-primary size-5 shrink-0" aria-hidden />
              Rate limits
            </h2>
            <p className="text-ds-on-surface-variant mb-6 text-sm leading-relaxed">
              Throttle how many user messages an agent accepts within a rolling time window.
            </p>
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-8">
                <div>
                  <label
                    htmlFor="rate-limit-messages"
                    className="text-ds-on-surface mb-1.5 block text-sm font-semibold"
                  >
                    Max messages
                  </label>
                  <p className="text-ds-on-surface-variant mb-2 text-xs leading-relaxed">
                    Allowed before the limit message is shown.
                  </p>
                  <div className="w-28">
                    <input
                      id="rate-limit-messages"
                      className="ds-app-field rounded-ds-lg py-2.5 text-center tabular-nums font-semibold"
                      type="number"
                      min={1}
                      defaultValue={20}
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="rate-limit-window"
                    className="text-ds-on-surface mb-1.5 block text-sm font-semibold"
                  >
                    Window (seconds)
                  </label>
                  <p className="text-ds-on-surface-variant mb-2 text-xs leading-relaxed">
                    Rolling period the count applies to.
                  </p>
                  <div className="w-28">
                    <input
                      id="rate-limit-window"
                      className="ds-app-field rounded-ds-lg py-2.5 text-center tabular-nums font-semibold"
                      type="number"
                      min={1}
                      defaultValue={60}
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
                />
              </div>
              <div className="border-ds-outline flex justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  className="text-ds-on-surface-variant hover:text-ds-on-surface rounded-ds-lg px-5 py-2 text-sm font-semibold transition-colors hover:bg-ds-sidebar"
                >
                  Reset
                </button>
                <button
                  type="button"
                  className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary rounded-ds-lg px-5 py-2 text-sm font-semibold shadow-sm transition-colors"
                >
                  Save changes
                </button>
              </div>
            </div>
          </section>

          <section className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
            <h2 className="ds-app-section-title mb-6 flex items-center gap-2 text-base">
              <IconBell className="text-ds-primary size-5 shrink-0" aria-hidden />
              Notifications
            </h2>
            <div className="space-y-6">
              {notificationOptions.map((option) => (
                <label key={option.title} className="flex cursor-pointer items-start gap-4">
                  <div className="relative mt-0.5 flex h-5 items-center">
                    <input
                      type="checkbox"
                      defaultChecked={option.checked}
                      className="border-ds-outline text-ds-primary focus:ring-ds-primary/25 size-5 rounded"
                    />
                  </div>
                  <div className="text-sm">
                    <span className="text-ds-on-surface block font-semibold">{option.title}</span>
                    <span className="text-ds-on-surface-variant mt-0.5 block leading-relaxed">
                      {option.description}
                    </span>
                  </div>
                </label>
              ))}
              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary rounded-ds-lg px-6 py-2 text-sm font-semibold shadow-sm transition-colors"
                >
                  Save preferences
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-ds-xl border border-rose-200 bg-rose-50/80 p-6">
            <h2 className="ds-app-section-title mb-2 flex items-center gap-2 text-base text-rose-900">
              <IconWarning className="size-5 shrink-0 text-rose-700" aria-hidden />
              Danger zone
            </h2>
            <p className="text-sm leading-relaxed text-rose-800/90">
              Irreversible actions that permanently affect your data and account.
            </p>
            <div className="mt-6 space-y-4">
              <DangerItem
                title="Clear data"
                description="Permanently remove all chat logs and history."
                action="Delete all conversations"
                subtle
                icon={<IconDeleteSweep className="size-4.5 shrink-0" aria-hidden />}
              />
              <DangerItem
                title="Close account"
                description="Deactivate your profile and remove associated personal information."
                action="Delete account"
                icon={<IconDeleteForever className="size-4.5 shrink-0" aria-hidden />}
              />
            </div>
          </section>
        </div>

        <footer className="ds-app-kicker mt-12 pb-8 text-center">ChatRely · Settings</footer>
      </div>
    </div>
  );
}

function DangerItem({
  title,
  description,
  action,
  icon,
  subtle = false,
}: {
  title: string;
  description: string;
  action: string;
  icon: ReactNode;
  subtle?: boolean;
}) {
  return (
    <div className="border-ds-outline flex flex-col justify-between gap-4 rounded-ds-lg border bg-ds-surface p-4 sm:flex-row sm:items-center">
      <div className="min-w-0">
        <h3 className="text-ds-on-surface text-sm font-semibold">{title}</h3>
        <p className="text-ds-on-surface-variant mt-0.5 text-xs leading-relaxed">{description}</p>
      </div>
      <button
        type="button"
        className={cn(
          "flex items-center justify-center gap-2 rounded-ds-lg px-5 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors",
          subtle
            ? "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
            : "bg-rose-600 text-white shadow-sm hover:bg-rose-700"
        )}
      >
        {icon}
        {action}
      </button>
    </div>
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

function IconUser({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </IconBase>
  );
}

function IconCamera({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 8h4l2-2h4l2 2h4v10H4z" />
      <circle cx="12" cy="13" r="3" />
    </IconBase>
  );
}

function IconMail({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </IconBase>
  );
}

function IconSpeed({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 14a8 8 0 1 1 16 0" />
      <path d="m12 12 4-4" />
      <path d="M12 20v-2" />
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

function IconWarning({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 3 2.8 19h18.4L12 3Z" />
      <path d="M12 9v4M12 16h.01" />
    </IconBase>
  );
}

function IconDeleteSweep({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 7h16M9 7V5h6v2M7 7l1 12h8l1-12" />
      <path d="m16.5 9.5 2 2 2.5-2.5" />
    </IconBase>
  );
}

function IconDeleteForever({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 7h16M9 7V5h6v2M7 7l1 12h8l1-12" />
      <path d="m10 11 4 4M14 11l-4 4" />
    </IconBase>
  );
}
