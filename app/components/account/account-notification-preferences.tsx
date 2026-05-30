"use client";

import { useEffect, useState } from "react";
import { BackendApiError, backendFetch } from "@/lib/backend-api";
import type { MeProfile } from "@/components/account/user-profile-context";
import { appButtonClassName } from "@/lib/button-styles";

const PREFS = [
  {
    key: "daily_conversations_report",
    title: "Receive email with daily conversations",
    description: "A full report of all interactions your chatbot had today.",
  },
] as const;

export function AccountNotificationPreferences({
  profile,
  onSaved,
}: {
  profile: MeProfile;
  onSaved?: () => Promise<void>;
}) {
  const initial = profile.notification_preferences ?? {};
  const [draft, setDraft] = useState<Record<string, boolean>>(() => {
    const d: Record<string, boolean> = {};
    for (const p of PREFS) {
      const v = initial[p.key];
      d[p.key] = typeof v === "boolean" ? v : false;
    }
    return d;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const next: Record<string, boolean> = {};
    const prefs = profile.notification_preferences ?? {};
    for (const p of PREFS) {
      const v = prefs[p.key];
      next[p.key] = typeof v === "boolean" ? v : false;
    }
    setDraft(next);
  }, [profile.id, profile.updated_at, profile.notification_preferences]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const notification_preferences: Record<string, boolean> = {};
      for (const p of PREFS) {
        notification_preferences[p.key] = Boolean(draft[p.key]);
      }
      await backendFetch<MeProfile>("/api/v1/me/profile", {
        method: "PATCH",
        body: JSON.stringify({ notification_preferences }),
      });
      if (onSaved) await onSaved();
    } catch (e) {
      setError(e instanceof BackendApiError ? e.message : "Could not save preferences");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {PREFS.map((option) => (
        <label key={option.key} className="flex cursor-pointer items-start gap-4">
          <div className="relative mt-0.5 flex h-5 items-center">
            <input
              type="checkbox"
              checked={Boolean(draft[option.key])}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  [option.key]: e.target.checked,
                }))
              }
              className="border-ds-outline text-ds-primary focus:ring-ds-primary/25 size-5 rounded"
            />
          </div>
          <div className="text-sm">
            <span className="text-ds-on-surface block font-semibold">{option.title}</span>
            <span className="text-ds-on-surface-variant mt-0.5 block leading-relaxed">{option.description}</span>
          </div>
        </label>
      ))}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className={appButtonClassName()}
        >
          {saving ? "Saving…" : "Save preferences"}
        </button>
      </div>
    </div>
  );
}
