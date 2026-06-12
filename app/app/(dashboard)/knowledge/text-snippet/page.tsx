"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DataSourcesSidebar } from "@/components/knowledge/data-sources-sidebar";
import {
  type KnowledgeSnippetRow as SnippetRow,
  useKnowledgeDataSources,
} from "@/components/knowledge/knowledge-data-sources-context";
import {
  CollapsibleSection,
  KnowledgeSearchInput,
  KnowledgeSortMenu,
  StatusPill,
} from "@/components/knowledge/knowledge-controls";
import { IconChevron, IconMoreVertical } from "@/components/knowledge/knowledge-icons";
import { KnowledgeMobileSubnav } from "@/components/knowledge/knowledge-mobile-subnav";
import { KnowledgeWorkspaceShell } from "@/components/knowledge/knowledge-workspace-shell";
import {
  makeSortComparator,
  useSortPreference,
} from "@/components/knowledge/use-sort-preference";
import {
  KnowledgeExpandedBodySkeleton,
  KnowledgeSnippetTableSkeleton,
} from "@/components/knowledge/knowledge-list-skeleton";
import { DashboardSelectAgentEmptyState } from "@/components/dashboard/dashboard-page-skeleton";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { BackendApiError, backendFetch } from "@/lib/backend-api";
import { formatLocaleDateTime } from "@/lib/format-locale-datetime";
import { appButtonClassName } from "@/lib/button-styles";
import { useClientMounted } from "@/lib/use-client-mounted";
import { knowledgeSourceStatusPill } from "@/lib/knowledge-status-labels";
import { cn } from "@/lib/utils";

type SnippetIndexResponse = {
  source: {
    id: string;
    title: string;
    status: string;
    last_indexed_at: string | null;
    updated_at: string;
  };
};

function snippetRowFromSave(
  source: SnippetIndexResponse["source"],
  bodyText: string
): SnippetRow {
  return {
    id: source.id,
    title: source.title,
    status: source.status,
    character_count: bodyText.length,
    preview: bodyText.slice(0, 400),
    last_indexed_at: source.last_indexed_at,
    updated_at: source.updated_at,
  };
}

function pendingSnippetId(): string {
  return `pending-${crypto.randomUUID()}`;
}

function isPendingSnippetId(id: string): boolean {
  return id.startsWith("pending-");
}

export default function KnowledgeTextSnippetPage() {
  const localeReady = useClientMounted();
  const searchParams = useSearchParams();
  const highlightSourceId = searchParams.get("source")?.trim() ?? null;
  const { selectedAgentId, agentsLoading } = useDashboardAgent();
  const knowledgeDs = useKnowledgeDataSources();
  const { refreshUsage } = knowledgeDs ?? { refreshUsage: async () => {} };
  const loadSnippetSources = knowledgeDs?.loadSnippetSources;
  const setSnippetSources = knowledgeDs?.setSnippetSources;
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [createExpanded, setCreateExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useSortPreference("snippets");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedBody, setExpandedBody] = useState<string>("");
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [pendingSnippetBodies, setPendingSnippetBodies] = useState<Record<string, string>>({});
  const rowsRef = useRef<SnippetRow[]>([]);
  const abandonedPendingRef = useRef(new Set<string>());
  const pendingToRealRef = useRef(new Map<string, string>());
  const sourceCache =
    knowledgeDs?.agentId === selectedAgentId ? knowledgeDs.snippets : { rows: null, loading: false, error: null };
  const rows = useMemo(() => sourceCache.rows ?? [], [sourceCache.rows]);
  rowsRef.current = rows;
  const loading = Boolean(selectedAgentId && sourceCache.loading && sourceCache.rows === null);
  const visibleError = error ?? sourceCache.error;

  useEffect(() => {
    if (!selectedAgentId || !loadSnippetSources) return;
    let cancelled = false;
    void (async () => {
      setError(null);
      try {
        await loadSnippetSources();
        if (!cancelled) await refreshUsage({ silent: true });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load snippets");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedAgentId, loadSnippetSources, refreshUsage]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let result = rows;
    if (q) {
      result = result.filter(
        (r) => r.title.toLowerCase().includes(q) || (r.preview ?? "").toLowerCase().includes(q)
      );
    }
    const cmp = makeSortComparator<SnippetRow>(
      sortKey,
      (r) => r.status,
      (r) => r.last_indexed_at ?? r.updated_at
    );
    if (cmp) result = [...result].sort(cmp);
    return result;
  }, [rows, searchQuery, sortKey]);

  const indexingActive = useMemo(
    () => rows.some((r) => r.status === "indexing" || r.status === "pending"),
    [rows]
  );

  const prependSnippetRow = useCallback(
    (row: SnippetRow) => {
      if (!setSnippetSources) return;
      const next = [row, ...rowsRef.current.filter((existing) => existing.id !== row.id)];
      rowsRef.current = next;
      setSnippetSources(next);
    },
    [setSnippetSources]
  );

  const replaceSnippetRow = useCallback(
    (fromId: string, row: SnippetRow) => {
      if (!setSnippetSources) return;
      const next: SnippetRow[] = [];
      let replaced = false;
      for (const existing of rowsRef.current) {
        if (existing.id === fromId) {
          if (!replaced) {
            next.push(row);
            replaced = true;
          }
          continue;
        }
        if (fromId !== row.id && existing.id === row.id) continue;
        next.push(existing);
      }
      if (!replaced) next.unshift(row);
      rowsRef.current = next;
      setSnippetSources(next);
    },
    [setSnippetSources]
  );

  const removeSnippetRowLocal = useCallback(
    (id: string) => {
      if (!setSnippetSources) return;
      const next = rowsRef.current.filter((existing) => existing.id !== id);
      rowsRef.current = next;
      setSnippetSources(next);
    },
    [setSnippetSources]
  );

  const refreshSnippetsPreservingPending = useCallback(async () => {
    if (!loadSnippetSources || !setSnippetSources) return;
    const pendingBeforeLoad = rowsRef.current.filter((row) => isPendingSnippetId(row.id));
    const serverRows = await loadSnippetSources({ silent: true });
    const serverIds = new Set(serverRows.map((row) => row.id));

    for (const [tempId, realId] of pendingToRealRef.current.entries()) {
      if (serverIds.has(realId)) pendingToRealRef.current.delete(tempId);
    }

    if (pendingBeforeLoad.length === 0) return;

    const stillPending = pendingBeforeLoad.filter((row) => {
      if (serverIds.has(row.id)) return false;
      const realId = pendingToRealRef.current.get(row.id);
      return !(realId && serverIds.has(realId));
    });

    if (stillPending.length === 0) return;

    const mergedById = new Map<string, SnippetRow>();
    for (const row of stillPending) mergedById.set(row.id, row);
    for (const row of serverRows) mergedById.set(row.id, row);
    const merged = Array.from(mergedById.values());
    rowsRef.current = merged;
    setSnippetSources(merged);
  }, [loadSnippetSources, setSnippetSources]);

  useEffect(() => {
    if (!selectedAgentId || !indexingActive || !loadSnippetSources) return;
    const id = window.setInterval(() => {
      void refreshSnippetsPreservingPending();
    }, 3500);
    return () => window.clearInterval(id);
  }, [selectedAgentId, indexingActive, loadSnippetSources, refreshSnippetsPreservingPending]);

  const allFilteredSelected =
    filteredRows.length > 0 && filteredRows.every((r) => selected.has(r.id));

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const r of filteredRows) next.delete(r.id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const r of filteredRows) next.add(r.id);
        return next;
      });
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setBody("");
  }

  async function loadForEdit(id: string) {
    if (!selectedAgentId) return;
    setError(null);
    try {
      const detail = await backendFetch<{ id: string; title: string; text: string }>(
        `/api/v1/knowledge/snippets/sources/${encodeURIComponent(id)}`
      );
      setEditingId(detail.id);
      setTitle(detail.title);
      setBody(detail.text);
      setMenuOpenId(null);
      setCreateExpanded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load snippet");
    }
  }

  function saveSnippet() {
    if (!selectedAgentId || !title.trim() || !body.trim()) return;
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    setError(null);

    if (editingId) {
      const targetId = editingId;
      replaceSnippetRow(targetId, {
        id: targetId,
        title: trimmedTitle,
        status: "indexing",
        character_count: trimmedBody.length,
        preview: trimmedBody.slice(0, 400),
        last_indexed_at: null,
        updated_at: new Date().toISOString(),
      });
      resetForm();
      setCreateExpanded(false);

      void (async () => {
        try {
          const res = await backendFetch<SnippetIndexResponse>(
            `/api/v1/knowledge/snippets/sources/${encodeURIComponent(targetId)}`,
            {
              method: "PATCH",
              body: JSON.stringify({ title: trimmedTitle, text: trimmedBody }),
            }
          );
          replaceSnippetRow(targetId, snippetRowFromSave(res.source, trimmedBody));
          void refreshUsage({ silent: true });
        } catch (e) {
          if (e instanceof BackendApiError && e.code === "knowledge.storage_budget_exhausted") {
            setError(
              "This agent’s knowledge storage is full. Delete website, file, or snippet sources, or upgrade your plan."
            );
          } else {
            setError(e instanceof Error ? e.message : "Update failed");
          }
          replaceSnippetRow(targetId, {
            id: targetId,
            title: trimmedTitle,
            status: "failed",
            character_count: trimmedBody.length,
            preview: trimmedBody.slice(0, 400),
            last_indexed_at: null,
            updated_at: new Date().toISOString(),
          });
          void loadSnippetSources?.({ silent: true });
        }
      })();
      return;
    }

    const tempId = pendingSnippetId();
    prependSnippetRow({
      id: tempId,
      title: trimmedTitle,
      status: "indexing",
      character_count: trimmedBody.length,
      preview: trimmedBody.slice(0, 400),
      last_indexed_at: null,
      updated_at: new Date().toISOString(),
    });
    setPendingSnippetBodies((prev) => ({ ...prev, [tempId]: trimmedBody }));
    resetForm();

    void (async () => {
      try {
        const res = await backendFetch<SnippetIndexResponse>("/api/v1/knowledge/snippets", {
          method: "POST",
          body: JSON.stringify({
            agent_id: selectedAgentId,
            title: trimmedTitle,
            text: trimmedBody,
          }),
        });
        if (abandonedPendingRef.current.has(tempId)) {
          abandonedPendingRef.current.delete(tempId);
          pendingToRealRef.current.delete(tempId);
          try {
            await backendFetch<void>(
              `/api/v1/knowledge/snippets/sources/${encodeURIComponent(res.source.id)}`,
              { method: "DELETE" }
            );
          } catch {
            /* best effort */
          }
          void refreshUsage({ silent: true });
          return;
        }
        pendingToRealRef.current.set(tempId, res.source.id);
        replaceSnippetRow(tempId, snippetRowFromSave(res.source, trimmedBody));
        setPendingSnippetBodies((prev) => {
          const next = { ...prev };
          delete next[tempId];
          return next;
        });
        void refreshUsage({ silent: true });
      } catch (e) {
        if (abandonedPendingRef.current.has(tempId)) {
          abandonedPendingRef.current.delete(tempId);
          return;
        }
        if (e instanceof BackendApiError && e.code === "knowledge.storage_budget_exhausted") {
          setError(
            "This agent’s knowledge storage is full. Delete website, file, or snippet sources, or upgrade your plan."
          );
        } else {
          setError(e instanceof Error ? e.message : "Save failed");
        }
        replaceSnippetRow(tempId, {
          id: tempId,
          title: trimmedTitle,
          status: "failed",
          character_count: trimmedBody.length,
          preview: trimmedBody.slice(0, 400),
          last_indexed_at: null,
          updated_at: new Date().toISOString(),
        });
      }
    })();
  }

  async function removeSnippet(id: string) {
    if (!window.confirm("Delete this snippet? The agent will stop using it in answers.")) return;
    if (isPendingSnippetId(id)) {
      abandonedPendingRef.current.add(id);
      pendingToRealRef.current.delete(id);
      removeSnippetRowLocal(id);
      setPendingSnippetBodies((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setSelected((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      if (editingId === id) resetForm();
      setMenuOpenId(null);
      return;
    }
    setDeletingId(id);
    setError(null);
    try {
      await backendFetch<void>(`/api/v1/knowledge/snippets/sources/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (selectedAgentId) {
        await loadSnippetSources?.({ silent: true });
        await refreshUsage({ silent: true });
      }
      setSelected((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      if (editingId === id) resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
      setMenuOpenId(null);
    }
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (
      !window.confirm(
        `Delete ${selected.size} snippet${selected.size === 1 ? "" : "s"}? The agent will stop using them in answers.`
      )
    ) {
      return;
    }
    setBulkDeleting(true);
    setError(null);
    try {
      for (const id of selected) {
        try {
          await backendFetch<void>(`/api/v1/knowledge/snippets/sources/${encodeURIComponent(id)}`, {
            method: "DELETE",
          });
        } catch (e) {
          setError(e instanceof Error ? e.message : "Delete failed");
        }
      }
      setSelected(new Set());
      if (selectedAgentId) {
        await loadSnippetSources?.({ silent: true });
        await refreshUsage({ silent: true });
      }
    } finally {
      setBulkDeleting(false);
    }
  }

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedBody("");
      return;
    }
    setExpandedId(id);
    setExpandedBody("");
    if (isPendingSnippetId(id)) {
      setExpandedBody(pendingSnippetBodies[id] ?? rowsRef.current.find((r) => r.id === id)?.preview ?? "");
      return;
    }
    setExpandedLoading(true);
    try {
      const detail = await backendFetch<{ id: string; title: string; text: string }>(
        `/api/v1/knowledge/snippets/sources/${encodeURIComponent(id)}`
      );
      if (detail.id === id) setExpandedBody(detail.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load snippet");
    } finally {
      setExpandedLoading(false);
    }
  }

  return (
    <KnowledgeWorkspaceShell>
      <main className="ds-app-page-scroll ds-app-page-scroll--mobile-dock min-w-0 flex-1 overflow-y-auto overscroll-y-contain">
        <KnowledgeMobileSubnav active="text-snippet" />
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
          <div>
            <h1 className="ds-app-page-title">Text snippets</h1>
            <p className="ds-app-page-description ds-app-page-description--wide">
              Short excerpts you control. Saved snippets work like other knowledge in chat.
            </p>
          </div>

          <CollapsibleSection
            title={editingId ? "Edit snippet" : "Create snippet"}
            hideTitle
            headerClassName="bg-transparent py-1"
            headerContent={<div className="text-sm font-semibold text-ds-on-surface">{editingId ? "Edit snippet" : "Create snippet"}</div>}
            expanded={createExpanded || editingId !== null}
            onExpandedChange={(next) => {
              setCreateExpanded(next);
              if (!next && editingId) resetForm();
            }}
          >
            <div className="space-y-4 p-5 sm:p-6">
              <div>
                <label className="ds-app-kicker mb-2 block text-ds-on-surface-variant" htmlFor="snippet-title">
                  Title
                </label>
                <input
                  id="snippet-title"
                  className="ds-app-field rounded-ds-lg w-full"
                  placeholder="e.g. Return policy summary"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="ds-app-kicker mb-2 block text-ds-on-surface-variant" htmlFor="snippet-body">
                  Snippet text
                </label>
                <textarea
                  id="snippet-body"
                  className="ds-app-field rounded-ds-lg min-h-[140px] w-full"
                  placeholder="Write the text you want your AI to use…"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>
              {visibleError ? <p className="text-sm text-red-700">{visibleError}</p> : null}
              <div className="flex flex-wrap justify-end gap-2">
                {editingId ? (
                  <button
                    type="button"
                    className="text-ds-on-surface-variant rounded-ds-md border border-ds-outline px-4 py-2 text-sm font-semibold hover:bg-ds-sidebar"
                    onClick={() => resetForm()}
                  >
                    Cancel
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={!title.trim() || !body.trim()}
                  className={appButtonClassName()}
                  onClick={() => saveSnippet()}
                >
                  {editingId ? "Update snippet" : "Save snippet"}
                </button>
              </div>
            </div>
          </CollapsibleSection>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="ds-app-section-title">Snippet library</h2>
              <KnowledgeSearchInput
                placeholder="Search snippets…"
                className="w-full sm:w-72"
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>
            <div className="border-ds-outline flex items-center justify-between border-b pb-2">
              <label className="text-ds-on-surface flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="border-ds-outline size-4 rounded"
                  checked={allFilteredSelected}
                  onChange={toggleSelectAll}
                  aria-label="Select all"
                />
                <span className="font-semibold">Select all</span>
              </label>
              <div className="flex items-center gap-3">
                {selected.size > 0 ? (
                  <>
                    <span className="ds-app-body-muted font-medium">{selected.size} selected</span>
                    <button
                      type="button"
                      onClick={() => void bulkDelete()}
                      disabled={bulkDeleting}
                      className="rounded-ds-md bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800 disabled:opacity-60"
                    >
                      {bulkDeleting ? "Deleting…" : "Delete"}
                    </button>
                  </>
                ) : (
                  <span className="ds-app-body-muted font-medium">
                    {rows.length} snippet{rows.length === 1 ? "" : "s"}
                  </span>
                )}
                <KnowledgeSortMenu value={sortKey} onChange={setSortKey} />
              </div>
            </div>
            {!agentsLoading && !selectedAgentId ? (
              <DashboardSelectAgentEmptyState />
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className="ds-app-kicker bg-ds-sidebar/70 text-ds-on-surface-variant">
                    <th className="w-10 px-5 py-3 sm:px-6" />
                    <th className="px-4 py-3 font-semibold">Title</th>
                    <th className="w-28 px-4 py-3 font-semibold">Status</th>
                    <th className="w-24 px-4 py-3 font-semibold">Characters</th>
                    <th className="w-40 px-4 py-3 font-semibold">Last updated</th>
                    <th className="w-20 px-5 py-3 text-right font-semibold sm:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-ds-outline divide-y">
              {loading ? (
                <KnowledgeSnippetTableSkeleton rows={5} />
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6">
                    <div className="bg-ds-app-canvas px-4 py-6 text-center">
                      <p className="text-ds-on-surface text-sm font-medium">
                        {searchQuery.trim() ? "No matching snippets" : "No snippets yet"}
                      </p>
                      <p className="ds-app-body-muted mx-auto mt-1 max-w-md">
                        {searchQuery.trim()
                          ? "Try another search."
                          : "Create a snippet above so your agent can retrieve it in chat."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((snippet) => {
                  const isExpanded = expandedId === snippet.id;
                  return (
                    <Fragment key={snippet.id}>
                      <tr
                        id={`knowledge-source-${snippet.id}`}
                        className={cn(
                          "bg-ds-app-canvas transition-colors hover:bg-ds-nav-active/40",
                          highlightSourceId === snippet.id && "ring-2 ring-ds-primary/40 ring-inset"
                        )}
                      >
                        <td className="px-5 py-4 sm:px-6">
                          <input
                            type="checkbox"
                            className="border-ds-outline size-4 cursor-pointer rounded"
                            checked={selected.has(snippet.id)}
                            onChange={() => toggleOne(snippet.id)}
                            aria-label={`Select ${snippet.title}`}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            className="flex min-w-0 cursor-pointer items-center gap-2 text-left"
                            aria-expanded={isExpanded}
                            onClick={() => void toggleExpand(snippet.id)}
                          >
                            <IconChevron
                              className={cn(
                                "text-ds-on-surface-variant size-4 shrink-0 transition-transform",
                                isExpanded ? "rotate-90" : ""
                              )}
                            />
                            <span className="text-ds-on-surface block max-w-[24rem] truncate text-sm font-medium">{snippet.title}</span>
                          </button>
                        </td>
                        <td className="px-4 py-4 text-xs">
                          {(() => {
                            const s = knowledgeSourceStatusPill(snippet.status);
                            return <StatusPill label={s.label} tone={s.tone} />;
                          })()}
                        </td>
                        <td className="ds-app-body-muted px-4 py-4">
                          {snippet.character_count.toLocaleString()}
                        </td>
                        <td className="ds-app-body-muted px-4 py-4">
                          {formatLocaleDateTime(snippet.last_indexed_at, localeReady)}
                        </td>
                        <td className="px-5 py-4 text-right sm:px-6">
                          <div className="relative inline-flex">
                            <button
                              type="button"
                              className="text-ds-on-surface-variant hover:text-ds-on-surface cursor-pointer rounded-ds-md p-1"
                              aria-label="More"
                              onClick={() => setMenuOpenId((prev) => (prev === snippet.id ? null : snippet.id))}
                            >
                              <IconMoreVertical className="size-5" />
                            </button>
                            {menuOpenId === snippet.id ? (
                              <div className="border-ds-outline bg-ds-surface absolute top-full right-0 z-50 mt-1 min-w-[10rem] rounded-ds-md border py-1 shadow-lg">
                                <button
                                  type="button"
                                  className="text-ds-on-surface hover:bg-ds-sidebar block w-full px-3 py-2 text-left text-sm"
                                  onClick={() => void loadForEdit(snippet.id)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  disabled={deletingId === snippet.id}
                                  className="text-ds-on-surface hover:bg-ds-sidebar block w-full px-3 py-2 text-left text-sm disabled:opacity-60"
                                  onClick={() => void removeSnippet(snippet.id)}
                                >
                                  {deletingId === snippet.id ? "Deleting…" : "Delete"}
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr>
                          <td />
                          <td colSpan={5} className="bg-ds-sidebar/35 px-6 py-3">
                            {expandedLoading ? (
                              <KnowledgeExpandedBodySkeleton />
                            ) : (
                              <div className="space-y-1 pl-4">
                                <p className="ds-app-body-muted font-semibold uppercase tracking-wide">Snippet text</p>
                                <p className="text-ds-on-surface text-sm leading-relaxed whitespace-pre-wrap">
                                  {expandedBody || snippet.preview || "-"}
                                </p>
                              </div>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
                </tbody>
              </table>
            </div>
            )}
          </section>
        </div>

        <DataSourcesSidebar mobile className="lg:hidden" />
      </main>

      <DataSourcesSidebar className="hidden lg:flex" />
    </KnowledgeWorkspaceShell>
  );
}
