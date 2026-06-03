"use client";

import { useState } from "react";
import { appButtonClassName } from "@/lib/button-styles";
import { cn } from "@/lib/utils";

type VisitorContactFormProps = {
  onSubmit: (fields: { name: string; email: string }) => Promise<void>;
  className?: string;
  compact?: boolean;
};

export function VisitorContactForm({ onSubmit, className, compact = false }: VisitorContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) {
      setError("Name and email are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ name: trimmedName, email: trimmedEmail });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit contact details.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className={cn(
        "border-ds-outline rounded-ds-lg border bg-ds-surface p-3 shadow-sm",
        compact && "p-2.5",
        className
      )}
    >
      <p className={cn("text-ds-on-surface font-semibold", compact ? "text-xs" : "text-sm")}>
        Share your contact details
      </p>
      <p className={cn("text-ds-on-surface-variant mt-0.5", compact ? "text-[11px]" : "text-xs")}>
        Our team needs your name and email to follow up.
      </p>
      <div className={cn("mt-3 grid gap-2", compact ? "sm:grid-cols-1" : "sm:grid-cols-2")}>
        <label className="block min-w-0">
          <span className="text-ds-on-surface-variant mb-1 block text-[11px] font-semibold uppercase tracking-wide">
            Name
          </span>
          <input
            type="text"
            autoComplete="name"
            className="ds-app-field w-full rounded-ds-md py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            required
          />
        </label>
        <label className="block min-w-0">
          <span className="text-ds-on-surface-variant mb-1 block text-[11px] font-semibold uppercase tracking-wide">
            Email
          </span>
          <input
            type="email"
            autoComplete="email"
            className="ds-app-field w-full rounded-ds-md py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            required
          />
        </label>
      </div>
      {error ? <p className="text-rose-600 mt-2 text-xs">{error}</p> : null}
      <button
        type="submit"
        className={appButtonClassName("default", {
          size: compact ? "sm" : "md",
          className: cn("mt-3 w-full sm:w-auto", compact && "text-xs"),
        })}
        disabled={submitting}
      >
        {submitting ? "Sending…" : "Connect me with support"}
      </button>
    </form>
  );
}
