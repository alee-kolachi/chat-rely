"use client";

import { appButtonClassName } from "@/lib/button-styles";
import { cn } from "@/lib/utils";

export type UnsavedChangesActionBarProps = {
  open: boolean;
  isSaving?: boolean;
  saveDisabled?: boolean;
  onSave: () => void | Promise<void>;
  onCancel: () => void;
  message?: string;
  className?: string;
};

/** Floating Cancel / Save bar fixed to the bottom of the viewport when the form is dirty. */
export function UnsavedChangesActionBar({
  open,
  isSaving = false,
  saveDisabled = false,
  onSave,
  onCancel,
  message = "You have unsaved changes",
  className,
}: UnsavedChangesActionBarProps) {
  if (!open) return null;

  return (
    <div
      role="region"
      aria-label="Unsaved changes"
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 sm:pb-6",
        className
      )}
    >
      <div className="border-ds-primary/15 bg-ds-nav-active pointer-events-auto flex w-full max-w-xl flex-col gap-3 rounded-ds-xl border p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <p className="text-ds-on-surface text-sm font-medium">{message}</p>
        <div className="flex shrink-0 items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className={appButtonClassName("ghost", { size: "sm" })}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={saveDisabled || isSaving}
            className={appButtonClassName("primary", { size: "sm" })}
          >
            {isSaving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
