"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { IconChevron, IconSearch, IconTrash } from "@/components/knowledge/knowledge-icons";
import type { KnowledgeSortKey } from "@/components/knowledge/use-sort-preference";

/** Collapsible card with a header button + chevron. Same pattern as the Website "Add links" section. */
export function CollapsibleSection({
  title,
  headerContent,
  hideTitle = false,
  headerClassName,
  defaultExpanded = true,
  expanded: controlledExpanded,
  onExpandedChange,
  className,
  children,
}: {
  title: string;
  headerContent?: ReactNode;
  hideTitle?: boolean;
  headerClassName?: string;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (next: boolean) => void;
  className?: string;
  children: ReactNode;
}) {
  const [internal, setInternal] = useState(defaultExpanded);
  const expanded = controlledExpanded ?? internal;

  function toggle() {
    const next = !expanded;
    if (onExpandedChange) onExpandedChange(next);
    if (controlledExpanded === undefined) setInternal(next);
  }

  return (
    <section className={cn("border-ds-outline overflow-hidden rounded-ds-xl border bg-ds-surface shadow-sm", className)}>
      <button
        type="button"
        className={cn(
          "border-ds-outline flex w-full cursor-pointer items-center justify-between border-b px-5 py-3 text-left transition-colors sm:px-6",
          headerClassName
        )}
        onClick={toggle}
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1">
          {headerContent ? (
            headerContent
          ) : hideTitle ? null : (
            <h2 className="ds-app-section-title text-base">{title}</h2>
          )}
        </div>
        <IconChevron
          className={cn(
            "text-ds-on-surface-variant size-5 shrink-0 transition-transform",
            expanded ? "rotate-90" : ""
          )}
        />
      </button>
      {expanded ? children : null}
    </section>
  );
}

/** Search input matching the Website page styling. */
export function KnowledgeSearchInput({
  placeholder = "Search…",
  value,
  onChange,
  className,
}: {
  placeholder?: string;
  value: string;
  onChange: (next: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <IconSearch
        className="text-ds-on-surface-variant pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2"
      />
      <input
        className="ds-app-field rounded-ds-lg py-2 pr-4"
        style={{ paddingLeft: "2.9rem" }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

const SORT_LABELS: Record<KnowledgeSortKey, string> = {
  default: "Default",
  status: "Status",
  newest: "Newest",
  oldest: "Oldest",
};

const SORT_ORDER: KnowledgeSortKey[] = ["default", "status", "newest", "oldest"];

/** Sort dropdown with the four shared options. */
export function KnowledgeSortMenu({
  value,
  onChange,
  className,
}: {
  value: KnowledgeSortKey;
  onChange: (next: KnowledgeSortKey) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (ev: MouseEvent) => {
      if (ref.current && !ref.current.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        className="text-ds-on-surface-variant hover:text-ds-on-surface flex cursor-pointer items-center gap-1 text-sm"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>Sort by:</span>
        <span className="text-ds-on-surface font-semibold">{SORT_LABELS[value]}</span>
        <IconChevron className={cn("size-4 transition-transform", open ? "-rotate-90" : "rotate-90")} />
      </button>
      {open ? (
        <div
          role="menu"
          className="border-ds-outline bg-ds-surface absolute top-full right-0 z-20 mt-1 min-w-[10rem] rounded-ds-md border py-1 shadow-lg"
        >
          {SORT_ORDER.map((opt) => (
            <button
              key={opt}
              type="button"
              role="menuitem"
              className={cn(
                "hover:bg-ds-sidebar block w-full cursor-pointer px-3 py-2 text-left text-sm",
                opt === value ? "text-ds-primary font-semibold" : "text-ds-on-surface"
              )}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              {SORT_LABELS[opt]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type PillToneOption = "neutral" | "success" | "warning" | "danger" | "info";

/** Compact pill/tag rendered after a title or beside a URL. */
export function StatusPill({
  label,
  tone = "neutral",
  className,
}: {
  label: string;
  tone?: PillToneOption;
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "text-ds-on-surface-variant",
    success: "text-emerald-700",
    warning: "text-amber-700",
    danger: "text-rose-700",
    info: "text-sky-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center text-[11px] font-medium",
        tones[tone] ?? tones.neutral,
        className
      )}
    >
      {label}
    </span>
  );
}

/** Toolbar that appears when N rows are selected. Renders nothing when count is 0. */
export function MultiSelectToolbar({
  selectedCount,
  totalCount,
  onDelete,
  busy = false,
  itemLabel = "item",
  className,
}: {
  selectedCount: number;
  totalCount: number;
  onDelete: () => void;
  busy?: boolean;
  itemLabel?: string;
  className?: string;
}) {
  if (selectedCount === 0) return null;
  return (
    <div
      className={cn(
        "border-ds-outline bg-ds-sidebar flex flex-wrap items-center justify-between gap-2 rounded-ds-md border px-3 py-2",
        className
      )}
    >
      <span className="text-ds-on-surface text-sm font-semibold">
        {selectedCount} of {totalCount} {itemLabel}
        {totalCount === 1 ? "" : "s"} selected
      </span>
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        className="inline-flex cursor-pointer items-center gap-1 rounded-ds-md bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-800 transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <IconTrash className="size-4" />
        {busy ? "Deleting…" : "Delete"}
      </button>
    </div>
  );
}

/** Modal shell used by edit/exclude flows. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
  children,
  maxWidthClassName = "max-w-md",
}: {
  open: boolean;
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
  maxWidthClassName?: string;
}) {
  if (!open) return null;
  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={cn("absolute inset-0 bg-black/40", !busy && "cursor-pointer")}
        onClick={busy ? undefined : onCancel}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "border-ds-outline bg-ds-surface relative w-full rounded-ds-xl border p-5 shadow-xl",
          maxWidthClassName
        )}
      >
        <h3 className="text-ds-on-surface mb-2 text-base font-semibold">{title}</h3>
        {message ? <p className="text-ds-on-surface-variant mb-4 text-sm leading-relaxed">{message}</p> : null}
        {children}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar cursor-pointer rounded-ds-md border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              "cursor-pointer rounded-ds-md px-4 py-2 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-60",
              destructive
                ? "bg-rose-600 text-white hover:opacity-90"
                : "bg-ds-primary text-ds-on-primary hover:bg-ds-secondary"
            )}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
  if (typeof document === "undefined") return content;
  return createPortal(content, document.body);
}

/** Friendly status label and tone for a website page row. */
export function pageStatusPill(status: string): { label: string; tone: PillToneOption } {
  switch (status?.toLowerCase()) {
    case "parsed":
      return { label: "Indexed", tone: "success" };
    case "fetched":
      return { label: "Fetched", tone: "info" };
    case "failed":
      return { label: "Failed", tone: "danger" };
    case "queued":
      return { label: "Queued", tone: "neutral" };
    case "excluded":
      return { label: "Excluded", tone: "warning" };
    default:
      return { label: status || "Pending", tone: "neutral" };
  }
}
