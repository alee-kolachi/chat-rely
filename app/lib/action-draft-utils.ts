export type ActionDraftPatch = {
  enabled?: boolean;
  config?: Record<string, unknown>;
};

export function configsEqual(
  a: Record<string, unknown> | undefined,
  b: Record<string, unknown> | undefined
): boolean {
  return JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});
}

export function countActionDraftChanges(drafts: Record<string, ActionDraftPatch>): number {
  let count = 0;
  for (const patch of Object.values(drafts)) {
    if (patch.enabled !== undefined) count++;
    if (patch.config !== undefined) count++;
  }
  return count;
}

export function unsavedChangesMessage(draftCount: number, extraDirty = false): string {
  const total = draftCount + (extraDirty ? 1 : 0);
  if (total <= 1) return "You have unsaved changes";
  return `You have ${total} unsaved changes`;
}
