"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DataSourcesSidebar } from "@/components/knowledge/data-sources-sidebar";
import {
  type KnowledgeQARow as QARow,
  useKnowledgeDataSources,
} from "@/components/knowledge/knowledge-data-sources-context";
import {
  CollapsibleSection,
  KnowledgeSearchInput,
  KnowledgeSortMenu,
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
import { cn } from "@/lib/utils";

export default function KnowledgeQAndAPage() {
  const localeReady = useClientMounted();
  const searchParams = useSearchParams();
  const highlightSourceId = searchParams.get("source")?.trim() ?? null;
  const { selectedAgentId, agentsLoading } = useDashboardAgent();
  const knowledgeDs = useKnowledgeDataSources();
  const { refreshUsage } = knowledgeDs ?? { refreshUsage: async () => {} };
  const loadQaSources = knowledgeDs?.loadQaSources;
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [createExpanded, setCreateExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useSortPreference("qa");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedAnswer, setExpandedAnswer] = useState<string>("");
  const [expandedLoading, setExpandedLoading] = useState(false);
  const sourceCache =
    knowledgeDs?.agentId === selectedAgentId ? knowledgeDs.qa : { rows: null, loading: false, error: null };
  const rows = useMemo(() => sourceCache.rows ?? [], [sourceCache.rows]);
  const loading = Boolean(selectedAgentId && sourceCache.loading && sourceCache.rows === null);
  const visibleError = error ?? sourceCache.error;

  useEffect(() => {
    if (!selectedAgentId || !loadQaSources) return;
    let cancelled = false;
    void (async () => {
      setError(null);
      try {
        await loadQaSources();
        if (!cancelled) await refreshUsage({ silent: true });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load Q&A");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedAgentId, loadQaSources, refreshUsage]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let result = rows;
    if (q) {
      result = result.filter(
        (r) =>
          r.question.toLowerCase().includes(q) || (r.answer_preview ?? "").toLowerCase().includes(q)
      );
    }
    const cmp = makeSortComparator<QARow>(
      sortKey,
      (r) => r.status,
      (r) => r.last_indexed_at ?? r.updated_at
    );
    if (cmp) result = [...result].sort(cmp);
    return result;
  }, [rows, searchQuery, sortKey]);

  useEffect(() => {
    if (!highlightSourceId || loading) return;
    if (!rows.some((r) => r.id === highlightSourceId)) return;
    queueMicrotask(() => {
      setExpandedId(highlightSourceId);
      document.getElementById(`knowledge-source-${highlightSourceId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }, [highlightSourceId, rows, loading]);

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
    setQuestion("");
    setAnswer("");
  }

  async function loadForEdit(id: string) {
    if (!selectedAgentId) return;
    setError(null);
    try {
      const detail = await backendFetch<{ id: string; question: string; answer: string }>(
        `/api/v1/knowledge/qa/sources/${encodeURIComponent(id)}`
      );
      setEditingId(detail.id);
      setQuestion(detail.question);
      setAnswer(detail.answer);
      setMenuOpenId(null);
      setCreateExpanded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load Q&A");
    }
  }

  async function saveQa() {
    if (!selectedAgentId || !question.trim() || !answer.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await backendFetch(`/api/v1/knowledge/qa/sources/${encodeURIComponent(editingId)}`, {
          method: "PATCH",
          body: JSON.stringify({ question: question.trim(), answer: answer.trim() }),
        });
      } else {
        await backendFetch("/api/v1/knowledge/qa", {
          method: "POST",
          body: JSON.stringify({
            agent_id: selectedAgentId,
            question: question.trim(),
            answer: answer.trim(),
          }),
        });
      }
      resetForm();
      setCreateExpanded(false);
    } catch (e) {
      if (e instanceof BackendApiError && e.code === "knowledge.storage_budget_exhausted") {
        setError(
          "This agent’s knowledge storage is full. Delete website, file, snippet, or Q&A sources, or upgrade your plan."
        );
      } else {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    } finally {
      setSaving(false);
    }
    if (selectedAgentId) {
      void loadQaSources?.({ silent: true });
      void refreshUsage({ silent: true });
    }
  }

  async function removeQa(id: string) {
    if (!window.confirm("Delete this Q&A pair and all indexed chunks? This cannot be undone.")) return;
    setDeletingId(id);
    setError(null);
    try {
      await backendFetch<void>(`/api/v1/knowledge/qa/sources/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (selectedAgentId) {
        await loadQaSources?.({ silent: true });
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
        `Delete ${selected.size} Q&A pair${selected.size === 1 ? "" : "s"} and all indexed chunks? This cannot be undone.`
      )
    ) {
      return;
    }
    setBulkDeleting(true);
    setError(null);
    try {
      for (const id of selected) {
        try {
          await backendFetch<void>(`/api/v1/knowledge/qa/sources/${encodeURIComponent(id)}`, {
            method: "DELETE",
          });
        } catch (e) {
          setError(e instanceof Error ? e.message : "Delete failed");
        }
      }
      setSelected(new Set());
      if (selectedAgentId) {
        await loadQaSources?.({ silent: true });
        await refreshUsage({ silent: true });
      }
    } finally {
      setBulkDeleting(false);
    }
  }

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedAnswer("");
      return;
    }
    setExpandedId(id);
    setExpandedAnswer("");
    setExpandedLoading(true);
    try {
      const detail = await backendFetch<{ id: string; question: string; answer: string }>(
        `/api/v1/knowledge/qa/sources/${encodeURIComponent(id)}`
      );
      if (detail.id === id) setExpandedAnswer(detail.answer);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load Q&A");
    } finally {
      setExpandedLoading(false);
    }
  }

  return (
    <KnowledgeWorkspaceShell>
      <main className="min-w-0 flex-1 p-4 pb-32 md:p-8 md:pb-32">
        <KnowledgeMobileSubnav active="q-and-a" />
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <h1 className="ds-app-page-title">Q&A</h1>
            <p className="ds-app-page-description ds-app-page-description--wide">
              Question and answer pairs your agent can use in chat.
            </p>
          </div>

          <CollapsibleSection
            className="mb-8"
            title={editingId ? "Edit Q&A pair" : "Create Q&A pair"}
            hideTitle
            headerClassName="bg-transparent py-1"
            headerContent={<div className="text-sm font-semibold text-ds-on-surface">{editingId ? "Edit Q&A pair" : "Create Q&A pair"}</div>}
            expanded={createExpanded || editingId !== null}
            onExpandedChange={(next) => {
              setCreateExpanded(next);
              if (!next && editingId) resetForm();
            }}
          >
            <div className="space-y-4 p-5 sm:p-6">
              <div>
                <label className="ds-app-kicker mb-2 block text-ds-on-surface-variant" htmlFor="qa-question">
                  Question
                </label>
                <input
                  id="qa-question"
                  className="ds-app-field rounded-ds-lg w-full"
                  placeholder="e.g. How long does delivery take?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
              </div>
              <div>
                <label className="ds-app-kicker mb-2 block text-ds-on-surface-variant" htmlFor="qa-answer">
                  Answer
                </label>
                <textarea
                  id="qa-answer"
                  className="ds-app-field rounded-ds-lg min-h-[140px] w-full"
                  placeholder="Provide a clear, concise answer…"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
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
                  disabled={saving || !question.trim() || !answer.trim()}
                  className={appButtonClassName()}
                  onClick={() => void saveQa()}
                >
                  {saving ? "Saving…" : editingId ? "Update Q&A" : "Save Q&A"}
                </button>
              </div>
            </div>
          </CollapsibleSection>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="ds-app-section-title">Q&A library</h2>
              <KnowledgeSearchInput
                placeholder="Search Q&A…"
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
                    {rows.length} pair{rows.length === 1 ? "" : "s"}
                  </span>
                )}
                <KnowledgeSortMenu value={sortKey} onChange={setSortKey} />
              </div>
            </div>
            {!agentsLoading && !selectedAgentId ? (
              <DashboardSelectAgentEmptyState />
            ) : (
            <div className="overflow-visible">
              <table className="w-full text-left">
                <thead>
                  <tr className="ds-app-kicker bg-ds-sidebar/70 text-ds-on-surface-variant">
                    <th className="w-10 px-5 py-3 sm:px-6" />
                    <th className="px-4 py-3 font-semibold">Question</th>
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
                  <td colSpan={5} className="px-4 py-6">
                    <div className="bg-ds-sidebar px-4 py-6 text-center">
                      <p className="text-ds-on-surface text-sm font-medium">
                        {searchQuery.trim() ? "No matching Q&A" : "No Q&A pairs yet"}
                      </p>
                      <p className="ds-app-body-muted mx-auto mt-1 max-w-md">
                        {searchQuery.trim()
                          ? "Try another search."
                          : "Add a curated question and answer above for consistent replies."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((item) => {
                  const isExpanded = expandedId === item.id;
                  return (
                    <Fragment key={item.id}>
                      <tr
                        id={`knowledge-source-${item.id}`}
                        className={cn(
                          "bg-ds-surface transition-colors hover:bg-ds-sidebar/40",
                          highlightSourceId === item.id && "ring-2 ring-ds-primary/40 ring-inset"
                        )}
                      >
                        <td className="px-5 py-4 sm:px-6">
                          <input
                            type="checkbox"
                            className="border-ds-outline size-4 cursor-pointer rounded"
                            checked={selected.has(item.id)}
                            onChange={() => toggleOne(item.id)}
                            aria-label={`Select ${item.question}`}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            className="flex min-w-0 cursor-pointer items-center gap-2 text-left"
                            aria-expanded={isExpanded}
                            onClick={() => void toggleExpand(item.id)}
                          >
                            <IconChevron
                              className={cn(
                                "text-ds-on-surface-variant size-4 shrink-0 transition-transform",
                                isExpanded ? "rotate-90" : ""
                              )}
                            />
                            <span className="text-ds-on-surface block max-w-[24rem] truncate text-sm font-medium">
                              Q: {item.question}
                            </span>
                          </button>
                        </td>
                        <td className="ds-app-body-muted px-4 py-4">
                          {item.character_count.toLocaleString()}
                        </td>
                        <td className="ds-app-body-muted px-4 py-4">
                          {formatLocaleDateTime(item.last_indexed_at, localeReady)}
                        </td>
                        <td className="px-5 py-4 text-right sm:px-6">
                          <div className="relative inline-flex shrink-0">
                            <button
                              type="button"
                              className="text-ds-on-surface-variant hover:text-ds-on-surface cursor-pointer rounded-ds-md p-1"
                              aria-label="More"
                              onClick={() => setMenuOpenId((prev) => (prev === item.id ? null : item.id))}
                            >
                              <IconMoreVertical className="size-5" />
                            </button>
                            {menuOpenId === item.id ? (
                              <div className="border-ds-outline bg-ds-surface absolute top-full right-0 z-50 mt-1 min-w-[10rem] rounded-ds-md border py-1 shadow-lg">
                                <button
                                  type="button"
                                  className="text-ds-on-surface hover:bg-ds-sidebar block w-full px-3 py-2 text-left text-sm"
                                  onClick={() => void loadForEdit(item.id)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  disabled={deletingId === item.id}
                                  className="text-ds-on-surface hover:bg-ds-sidebar block w-full px-3 py-2 text-left text-sm disabled:opacity-60"
                                  onClick={() => void removeQa(item.id)}
                                >
                                  {deletingId === item.id ? "Deleting…" : "Delete"}
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr>
                          <td />
                          <td colSpan={4} className="bg-ds-sidebar/35 px-6 py-3">
                            {expandedLoading ? (
                              <KnowledgeExpandedBodySkeleton />
                            ) : (
                              <div className="space-y-1 pl-4">
                                <p className="ds-app-body-muted font-semibold uppercase tracking-wide">Answer</p>
                                <p className="text-ds-on-surface text-sm leading-relaxed whitespace-pre-wrap">
                                  {expandedAnswer || item.answer_preview || "-"}
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

      <DataSourcesSidebar className="hidden lg:block" />
    </KnowledgeWorkspaceShell>
  );
}
