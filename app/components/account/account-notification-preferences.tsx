"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BackendApiError, backendFetch } from "@/lib/backend-api";
import type { MeProfile } from "@/components/account/user-profile-context";
import { UnsavedChangesActionBar } from "@/components/ui/unsaved-changes-action-bar";

const PREFS = [
  {
    key: "daily_conversations_report",
    title: "Receive email with daily conversations",
    description: "A full report of all interactions your chatbot had today.",
  },
] as const;

function buildDraftFromProfile(profile: MeProfile): Record<string, boolean> {
  const prefs = profile.notification_preferences ?? {};
  const d: Record<string, boolean> = {};
  for (const p of PREFS) {
    const v = prefs[p.key];
    d[p.key] = typeof v === "boolean" ? v : false;
  }
  return d;
}

function draftsEqual(a: Record<string, boolean>, b: Record<string, boolean>): boolean {
  for (const p of PREFS) {
    if (Boolean(a[p.key]) !== Boolean(b[p.key])) return false;
  }
  return true;
}

export function AccountNotificationPreferences({
  profile,
  onSaved,
}: {
  profile: MeProfile;
  onSaved?: () => Promise<void>;
}) {
  const serverDraft = useMemo(() => buildDraftFromProfile(profile), [profile]);
  const [draft, setDraft] = useState<Record<string, boolean>>(() => serverDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(serverDraft);
  }, [serverDraft]);

  const isDirty = !draftsEqual(draft, serverDraft);

  const handleCancel = useCallback(() => {
    setDraft(serverDraft);
    setError(null);
  }, [serverDraft]);

  const handleSave = useCallback(async () => {
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
  }, [draft, onSaved]);

  return (
    <>
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
      </div>

      <UnsavedChangesActionBar
        open={isDirty}
        isSaving={saving}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </>
  );
}
