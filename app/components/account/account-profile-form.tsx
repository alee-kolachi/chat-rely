"use client";

import { useRef, useState } from "react";
import { Camera, Mail, UserRound } from "lucide-react";
import { BackendApiError, backendFetch } from "@/lib/backend-api";
import { createBrowserSupabaseClient } from "@/lib/supabase";
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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function patchProfile(payload: Partial<{ full_name: string; email: string; avatar_url: string | null }>) {
    setSaving(true);
    setSaveError(null);
    try {
      await backendFetch<MeProfile>("/api/v1/me/profile", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      await refresh();
    } catch (e) {
      const msg =
        e instanceof BackendApiError && e.message ? e.message : "Could not save your profile.";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await patchProfile({ full_name: fullName, email });
  }

  async function onPickPhoto(files: FileList | null) {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    setUploading(true);
    setSaveError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setSaveError("You need to be signed in to upload a photo.");
        return;
      }
      const rawExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const ext = ["jpg", "jpeg", "png", "webp", "gif"].includes(rawExt) ? rawExt : "jpg";
      const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) {
        setSaveError(upErr.message);
        return;
      }
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      await patchProfile({ avatar_url: pub.publicUrl });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function clearPhoto() {
    await patchProfile({ avatar_url: null });
  }

  const displayInitials = initialsFromProfile(profile);

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
          <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-[auto_1fr]">
            <div className="group relative mx-auto shrink-0 sm:mx-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => void onPickPhoto(e.target.files)}
              />
              <div className="border-ds-outline bg-ds-sidebar relative flex size-20 items-center justify-center overflow-hidden rounded-ds-lg border-2">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- user-supplied Supabase public URL
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="text-ds-on-surface-variant text-xs font-semibold">
                    {displayInitials}
                  </div>
                )}
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex cursor-pointer items-center justify-center bg-ds-on-surface/45 opacity-0 transition-opacity group-hover:opacity-100 disabled:cursor-wait"
                >
                  <IconCamera className="text-ds-on-primary size-5" aria-hidden />
                </button>
              </div>
              <div className="mt-2 flex flex-col items-center gap-1 sm:items-stretch">
                <button
                  type="button"
                  disabled={uploading || saving}
                  onClick={() => fileInputRef.current?.click()}
                  className="text-ds-primary block w-full text-center text-[11px] font-semibold tracking-wide uppercase hover:underline disabled:opacity-60"
                >
                  {uploading ? "Uploading…" : "Change photo"}
                </button>
                {profile.avatar_url ? (
                  <button
                    type="button"
                    disabled={uploading || saving}
                    onClick={() => void clearPhoto()}
                    className="text-ds-on-surface-variant hover:text-ds-on-surface text-[11px] font-medium hover:underline disabled:opacity-60"
                  >
                    Remove photo
                  </button>
                ) : null}
              </div>
            </div>
            <div className="min-w-0">
              <label className="ds-app-kicker mb-2 block text-ds-on-surface-variant">Full name</label>
              <input
                className="ds-app-field rounded-ds-lg"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                disabled={saving}
              />
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
          <label className="ds-app-kicker mb-2 block text-ds-on-surface-variant">Email address</label>
          <input
            className="ds-app-field rounded-ds-lg"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={saving}
          />
          <p className="text-ds-on-surface-variant mt-2 text-xs leading-relaxed">
            Update your sign-in email. You may need to confirm the new address depending on your workspace settings.
          </p>
        </div>
      </div>

      <div className="mt-8 flex justify-end border-t border-ds-outline pt-6">
        <button
          type="submit"
          disabled={saving || uploading}
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

function IconCamera({ className }: { className?: string }) {
  return <Camera className={className} strokeWidth={1.8} aria-hidden />;
}
