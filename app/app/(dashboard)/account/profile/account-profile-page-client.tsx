"use client";

import { Bell, TriangleAlert } from "lucide-react";
import { AccountProfileForm } from "@/components/account/account-profile-form";
import { AccountNotificationPreferences } from "@/components/account/account-notification-preferences";
import { useUserProfile } from "@/components/account/user-profile-context";

export function AccountProfilePageClient() {
  const { profile, loading, error, refresh } = useUserProfile();

  if (loading && !profile) {
    return (
      <div className="ds-app-shell p-6 md:p-8">
        <p className="text-ds-on-surface-variant text-sm">Loading account…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="ds-app-shell p-6 md:p-8">
        <p className="text-sm text-rose-600">{error ?? "Unable to load profile."}</p>
      </div>
    );
  }

  return (
    <div className="ds-app-shell p-6 md:p-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-10">
          <h1 className="ds-app-page-title">Account</h1>
          <p className="text-ds-on-surface-variant ds-app-page-description ds-app-page-description--wide mt-2">
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
            <AccountNotificationPreferences profile={profile} onSaved={refresh} />
          </section>

          <section className="rounded-ds-xl border border-rose-200 bg-rose-50/80 p-6">
            <h2 className="ds-app-section-title mb-2 flex items-center gap-2 text-base text-rose-900">
              <IconWarning className="size-5 shrink-0 text-rose-700" aria-hidden />
              Danger zone
            </h2>
            <p className="text-sm leading-relaxed text-rose-800/90">
              To close your account or delete workspace data, contact{" "}
              <a href="mailto:support@chatrely.com" className="font-semibold text-rose-900 underline">
                support@chatrely.com
              </a>
              . Account deletion is handled manually to avoid accidental data loss.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function IconBell({ className }: { className?: string }) {
  return <Bell className={className} strokeWidth={1.8} aria-hidden />;
}

function IconWarning({ className }: { className?: string }) {
  return <TriangleAlert className={className} strokeWidth={1.8} aria-hidden />;
}
