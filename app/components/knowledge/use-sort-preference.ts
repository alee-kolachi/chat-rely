"use client";

import { useCallback, useState } from "react";

export type KnowledgeSortKey = "default" | "status" | "newest" | "oldest";

export type KnowledgeScreen = "website" | "files" | "snippets" | "qa";

const STORAGE_KEY_PREFIX = "knowledge.sort.";

const VALID_VALUES: ReadonlySet<KnowledgeSortKey> = new Set([
  "default",
  "status",
  "newest",
  "oldest",
]);

function readInitial(screen: KnowledgeScreen): KnowledgeSortKey {
  if (typeof window === "undefined") return "default";
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${screen}`);
    if (raw && VALID_VALUES.has(raw as KnowledgeSortKey)) {
      return raw as KnowledgeSortKey;
    }
  } catch {
    /* ignore (private mode, disabled storage) */
  }
  return "default";
}

/** Persists the sort preference per Knowledge screen in localStorage. SSR-safe. */
export function useSortPreference(
  screen: KnowledgeScreen
): [KnowledgeSortKey, (next: KnowledgeSortKey) => void] {
  const [value, setValue] = useState<KnowledgeSortKey>(() => readInitial(screen));

  const update = useCallback(
    (next: KnowledgeSortKey) => {
      setValue(next);
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${screen}`, next);
      } catch {
        /* ignore */
      }
    },
    [screen]
  );

  return [value, update];
}

/**
 * Sort order for the "Status" option.
 * `ready` first, then `indexing`, then `failed`, then everything else.
 */
const STATUS_RANK: Record<string, number> = {
  ready: 0,
  indexing: 1,
  failed: 2,
};

export function statusRank(status: string | null | undefined): number {
  if (!status) return 99;
  const rank = STATUS_RANK[status.toLowerCase()];
  return rank ?? 50;
}

/** Comparator factory used by every screen. `getDate` returns a Date-parseable string. */
export function makeSortComparator<T>(
  sortKey: KnowledgeSortKey,
  getStatus: (row: T) => string | null | undefined,
  getDate: (row: T) => string | null | undefined
): ((a: T, b: T) => number) | null {
  if (sortKey === "default") return null;
  if (sortKey === "status") {
    return (a, b) => statusRank(getStatus(a)) - statusRank(getStatus(b));
  }
  return (a, b) => {
    const ta = Date.parse(getDate(a) ?? "") || 0;
    const tb = Date.parse(getDate(b) ?? "") || 0;
    return sortKey === "newest" ? tb - ta : ta - tb;
  };
}
