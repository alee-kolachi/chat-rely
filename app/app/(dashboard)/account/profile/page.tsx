import type { ReactNode } from "react";
import { AccountProfileForm } from "@/components/account/account-profile-form";
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

export default function AccountProfilePage() {
  return (
    <div className="ds-app-shell p-6 md:p-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-10">
          <h1 className="ds-app-page-title">Account</h1>
          <p className="ds-app-page-description ds-app-page-description--wide mt-2">
            Profile and preferences for your user account (not per chatbot).
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6">
          <section className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
            <AccountProfileForm />
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
            <div className="mt-6">
              <DangerItem
                title="Close account"
                description="Deactivate your profile and remove associated personal information."
                action="Delete account"
                icon={<IconDeleteForever className="size-4.5 shrink-0" aria-hidden />}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function DangerItem({
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
        className={cn(
          "flex items-center justify-center gap-2 rounded-ds-lg px-5 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors",
          "bg-rose-600 text-white shadow-sm hover:bg-rose-700"
        )}
      >
        {icon}
        {action}
      </button>
    </div>
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

function IconDeleteForever({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 7h16M9 7V5h6v2M7 7l1 12h8l1-12" />
      <path d="m10 11 4 4M14 11l-4 4" />
    </IconBase>
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
