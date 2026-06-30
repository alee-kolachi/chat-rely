"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { useMeContext } from "@/components/layout/me-context-provider";
import { backendFetch } from "@/lib/backend-api";
import {
  AGENT_WIDGET_LOGO_KEY,
  deleteAgentWidgetLogoFiles,
  readAgentWidgetLogoUrl,
  uploadAgentWidgetLogo,
} from "@/lib/agent-logo";
import { mergeBehaviorSettings } from "@/lib/agent-settings";
import { cn } from "@/lib/utils";

type AgentLogoFieldProps = {
  agentId: string | null;
  behaviorSettings: Record<string, unknown> | null | undefined;
  websiteFaviconUrl?: string | null;
  disabled?: boolean;
  onSaved: () => Promise<void>;
  className?: string;
};

export function AgentLogoField({
  agentId,
  behaviorSettings,
  websiteFaviconUrl,
  disabled = false,
  onSaved,
  className,
}: AgentLogoFieldProps) {
  const { data: meData } = useMeContext();
  const userId = meData?.profile?.id ?? null;
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOverride, setPreviewOverride] = useState<string | null>(null);

  const customLogoUrl = readAgentWidgetLogoUrl(behaviorSettings);
  const previewUrl = previewOverride ?? customLogoUrl ?? websiteFaviconUrl?.trim() ?? null;
  const hasCustomLogo = Boolean(customLogoUrl);
  const busy = uploading || removing;

  useEffect(() => {
    queueMicrotask(() => setPreviewOverride(null));
  }, [agentId, customLogoUrl]);

  async function persistLogoUrl(nextUrl: string | null) {
    if (!agentId) return;
    const merged = mergeBehaviorSettings(behaviorSettings, {});
    if (nextUrl) {
      merged[AGENT_WIDGET_LOGO_KEY] = nextUrl;
    } else {
      delete merged[AGENT_WIDGET_LOGO_KEY];
    }
    await backendFetch(`/api/v1/agents/${agentId}`, {
      method: "PATCH",
      body: JSON.stringify({ behavior_settings: merged }),
    });
    await onSaved();
  }

  async function handleFileChange(file: File | null) {
    if (!file || !agentId || !userId || disabled || busy) return;
    setUploading(true);
    setError(null);
    try {
      const publicUrl = await uploadAgentWidgetLogo({ userId, agentId, file: file });
      setPreviewOverride(publicUrl);
      await persistLogoUrl(publicUrl);
    } catch (e) {
      setPreviewOverride(null);
      setError(e instanceof Error ? e.message : "Logo upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemoveCustomLogo() {
    if (!agentId || !userId || disabled || busy || !hasCustomLogo) return;
    setRemoving(true);
    setError(null);
    try {
      await deleteAgentWidgetLogoFiles({ userId, agentId });
      setPreviewOverride(null);
      await persistLogoUrl(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove logo");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className={cn("flex shrink-0 flex-col items-center gap-1", className)}>
      <span className="ds-app-kicker text-ds-on-surface-variant">Logo</span>
      <div className="relative">
        <button
          type="button"
          disabled={disabled || busy || !agentId || !userId}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "border-ds-outline bg-ds-sidebar flex size-11 items-center justify-center overflow-hidden rounded-lg border shadow-sm transition-colors",
            "hover:border-ds-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-primary/30",
            (disabled || busy || !agentId || !userId) && "cursor-not-allowed opacity-50"
          )}
          aria-label={previewUrl ? "Change agent logo" : "Upload agent logo"}
          title={previewUrl ? "Change logo" : "Upload logo"}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              className="size-full object-contain p-1"
              referrerPolicy="no-referrer"
            />
          ) : (
            <ImagePlus className="text-ds-on-surface-variant size-5" strokeWidth={1.8} aria-hidden />
          )}
        </button>
        {hasCustomLogo ? (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => void handleRemoveCustomLogo()}
            className="border-ds-outline bg-ds-surface absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border shadow-sm hover:bg-ds-sidebar disabled:opacity-50"
            aria-label="Remove custom logo"
            title="Remove custom logo"
          >
            <X className="size-3" aria-hidden />
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(e) => void handleFileChange(e.target.files?.[0] ?? null)}
      />
      {busy ? <p className="text-ds-on-surface-variant text-[10px]">Saving…</p> : null}
      {error ? <p className="max-w-[7rem] text-center text-[10px] font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}
