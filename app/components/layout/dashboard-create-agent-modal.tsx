"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackendApiError, backendFetch } from "@/lib/backend-api";
import { appButtonClassName } from "@/lib/button-styles";
import { cn } from "@/lib/utils";

function slugFromName(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100) || ""
  );
}

type DashboardCreateAgentModalProps = {
  open: boolean;
  onClose: () => void;
  refreshAgents: () => Promise<void>;
  setSelectedAgentId: (id: string) => void;
};

export function DashboardCreateAgentModal({
  open,
  onClose,
  refreshAgents,
  setSelectedAgentId,
}: DashboardCreateAgentModalProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onClose]);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    const slug = slugFromName(trimmed) || undefined;

    async function post(body: { name: string; slug?: string }) {
      return backendFetch<{ id: string }>("/api/v1/agents", {
        method: "POST",
        body: JSON.stringify(body),
      });
    }

    try {
      const created = await post({ name: trimmed, slug });
      await refreshAgents();
      setSelectedAgentId(created.id);
      onClose();
      router.push(`/knowledge/website?agent=${encodeURIComponent(created.id)}`);
    } catch (e) {
      if (e instanceof BackendApiError && e.status === 409 && e.code === "agent.slug_conflict") {
        const retrySlug = `${slugFromName(trimmed) || "agent"}-${Date.now().toString(36)}`.slice(0, 120);
        try {
          const created = await post({ name: trimmed, slug: retrySlug });
          await refreshAgents();
          setSelectedAgentId(created.id);
          onClose();
          router.push(`/knowledge/website?agent=${encodeURIComponent(created.id)}`);
          return;
        } catch (e2) {
          setError(e2 instanceof Error ? e2.message : "Could not create agent");
          return;
        }
      }
      if (e instanceof BackendApiError && e.code === "plan.limit_exceeded") {
        setError("Your plan’s agent limit is reached. Upgrade to add more agents.");
        return;
      }
      setError(e instanceof Error ? e.message : "Could not create agent");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  const content = (
    <div className="fixed inset-0 z-[180] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        disabled={busy}
        className={cn("absolute inset-0 bg-black/40", !busy && "cursor-pointer")}
        onClick={busy ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-create-agent-title"
        className="border-ds-outline bg-ds-surface relative w-full max-w-md rounded-ds-xl border p-5 shadow-xl"
      >
        <h2 id="dashboard-create-agent-title" className="text-ds-on-surface text-base font-semibold">
          New agent
        </h2>
        <p className="ds-app-body-muted mt-1">
          Each agent has its own embed key, knowledge, and settings. Use one per store or brand.
        </p>
        <label className="mt-4 block">
          <span className="ds-app-label-muted mb-1 block uppercase tracking-wide">
            Display name
          </span>
          <input
            type="text"
            autoComplete="off"
            disabled={busy}
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            placeholder="e.g. Northwind storefront"
            className={cn(
              "ds-app-field mt-1 w-full rounded-lg border px-3 py-2 text-sm",
              "border-ds-outline bg-ds-surface text-ds-on-surface placeholder:text-ds-on-surface-variant/70",
              "focus:border-ds-primary focus:ring-ds-primary/25 focus:ring-2 focus:outline-none disabled:opacity-60"
            )}
            maxLength={120}
          />
        </label>
        {error ? (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100">
            <p>{error}</p>
            {error.includes("Upgrade") ? (
              <Link
                href="/account/plan"
                className="mt-2 inline-block font-semibold text-rose-900 underline decoration-rose-400 underline-offset-2 hover:opacity-90 dark:text-rose-50"
              >
                View billing and plans
              </Link>
            ) : null}
          </div>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={appButtonClassName("default", { className: "disabled:cursor-not-allowed" })}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy || !name.trim()}
            className={appButtonClassName("default", { className: "disabled:cursor-not-allowed" })}
          >
            {busy ? "Creating…" : "Create agent"}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return content;
  return createPortal(content, document.body);
}
