"use client";

import { useState } from "react";
import { Mail, UserRound } from "lucide-react";
import { BackendApiError, backendFetch } from "@/lib/backend-api";
import type { MeProfile } from "@/components/account/user-profile-context";
import { useUserProfile } from "@/components/account/user-profile-context";

export function AccountProfileForm() {
  const { profile, loading: ctxLoading, error: ctxError, refresh } = useUserProfile();

  if (ctxLoading && !profile) {
    return <p className="text-ds-on-surface-variant text-sm">Loading profile…</p>;
  }

  if (!profile) {
    return (
      <p className="text-ds-on-surface-variant text-sm">
        {ctxError ?? "Unable to load your profile."}
      </p>
    );
  }

  return (
    <AccountProfileEditor
      key={`${profile.id}-${profile.updated_at}`}
      profile={profile}
      refresh={refresh}
      ctxError={ctxError}
    />
  );
}

function AccountProfileEditor({
  profile,
  refresh,
  ctxError,
}: {
  profile: MeProfile;
  refresh: () => Promise<void>;
  ctxError: string | null;
}) {
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [email, setEmail] = useState(profile.email ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await backendFetch<MeProfile>("/api/v1/me/profile", {
        method: "PATCH",
        body: JSON.stringify({ full_name: fullName, email }),
      });
      await refresh();
    } catch (err) {
      const msg =
        err instanceof BackendApiError && err.message ? err.message : "Could not save your profile.";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {ctxError ? <p className="text-rose-600 mb-4 text-sm">{ctxError}</p> : null}
      {saveError ? <p className="text-rose-600 mb-4 text-sm">{saveError}</p> : null}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
        <div className="min-w-0 lg:border-r lg:border-ds-outline lg:pr-10">
          <h2 className="ds-app-section-title mb-6 flex items-center gap-2 text-base">
            <IconUser className="text-ds-primary size-5 shrink-0" aria-hidden />
            Profile
          </h2>
          <label className="ds-app-kicker mb-2 block text-ds-on-surface-variant">Full name</label>
          <input
            className="ds-app-field rounded-ds-lg"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            disabled={saving}
          />
          <p className="ds-app-body-muted mt-2">
            Shown on your profile and in notifications.
          </p>
        </div>

        <div className="min-w-0 border-t border-ds-outline pt-8 lg:border-t-0 lg:pt-0 lg:pl-10">
          <h2 className="ds-app-section-title mb-6 flex items-center gap-2 text-base">
            <IconMail className="text-ds-primary size-5 shrink-0" aria-hidden />
            Email
          </h2>
          <label className="ds-app-kicker mb-2 block text-ds-on-surface-variant">Email address</label>
          <input
            className="ds-app-field rounded-ds-lg"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={saving}
          />
          <p className="ds-app-body-muted mt-2">
            Update your sign-in email. You may need to confirm the new address depending on your workspace settings.
          </p>
        </div>
      </div>

      <div className="mt-8 flex justify-end border-t border-ds-outline pt-6">
        <button
          type="submit"
          disabled={saving}
          className="bg-ds-primary text-ds-on-primary hover:bg-ds-primary-hover rounded-ds-lg px-6 py-2 text-sm font-semibold shadow-sm transition-colors disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

export function initialsFromProfile(profile: Pick<MeProfile, "full_name" | "email">): string {
  const n = profile.full_name?.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]!.slice(0, 1)}${parts[parts.length - 1]!.slice(0, 1)}`.toUpperCase();
    }
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  const e = profile.email?.trim();
  if (e) return e.slice(0, 2).toUpperCase();
  return "?";
}

function IconUser({ className }: { className?: string }) {
  return <UserRound className={className} strokeWidth={1.8} aria-hidden />;
}

function IconMail({ className }: { className?: string }) {
  return <Mail className={className} strokeWidth={1.8} aria-hidden />;
}
