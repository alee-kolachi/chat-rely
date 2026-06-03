"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DataSourcesSidebar } from "@/components/knowledge/data-sources-sidebar";
import {
  type KnowledgeFileSourceRow as FileSourceRow,
  useKnowledgeDataSources,
} from "@/components/knowledge/knowledge-data-sources-context";
import {
  CollapsibleSection,
  KnowledgeSearchInput,
  KnowledgeSortMenu,
  StatusPill,
} from "@/components/knowledge/knowledge-controls";
import {
  IconCloudUpload,
  IconFile,
  IconMoreVertical,
} from "@/components/knowledge/knowledge-icons";
import { KnowledgeMobileSubnav } from "@/components/knowledge/knowledge-mobile-subnav";
import { KnowledgeWorkspaceShell } from "@/components/knowledge/knowledge-workspace-shell";
import {
  makeSortComparator,
  useSortPreference,
} from "@/components/knowledge/use-sort-preference";
import { KnowledgeFilesTableSkeleton } from "@/components/knowledge/knowledge-list-skeleton";
import { DashboardSelectAgentEmptyState } from "@/components/dashboard/dashboard-page-skeleton";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { BackendApiError, backendFetch } from "@/lib/backend-api";
import { formatLocaleDateTime } from "@/lib/format-locale-datetime";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";

type FileUploadResult = {
  status: "succeeded" | "failed";
  error_message?: string | null;
};

function fileNameFromRow(row: FileSourceRow): string {
  const fromPath = row.storage_path?.split("/").pop();
  return fromPath && fromPath.trim().length > 0 ? fromPath : row.title;
}

function sourceStatusPill(status: string): { label: string; tone: "success" | "danger" | "warning" | "neutral" } {
  switch ((status || "").toLowerCase()) {
    case "ready":
      return { label: "Succeeded", tone: "success" };
    case "failed":
      return { label: "Failed", tone: "danger" };
    case "indexing":
      return { label: "Processing", tone: "warning" };
    default:
      return { label: status || "Pending", tone: "neutral" };
  }
}

export default function KnowledgeFilesPage() {
  const localeReady = useClientMounted();
  const searchParams = useSearchParams();
  const highlightSourceId = searchParams.get("source")?.trim() ?? null;
  const { selectedAgentId, agentsLoading } = useDashboardAgent();
  const knowledgeDs = useKnowledgeDataSources();
  const { refreshUsage } = knowledgeDs ?? { refreshUsage: async () => {} };
  const loadFileSources = knowledgeDs?.loadFileSources;
  const [error, setError] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useSortPreference("files");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const sourceCache =
    knowledgeDs?.agentId === selectedAgentId ? knowledgeDs.files : { rows: null, loading: false, error: null };
  const rows = useMemo(() => sourceCache.rows ?? [], [sourceCache.rows]);
  const loading = Boolean(selectedAgentId && sourceCache.loading && sourceCache.rows === null);
  const visibleError = error ?? sourceCache.error;

  useEffect(() => {
    if (!selectedAgentId || !loadFileSources) return;
    let cancelled = false;
    void (async () => {
      setError(null);
      try {
        await loadFileSources();
        if (!cancelled) await refreshUsage({ silent: true });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load file sources");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedAgentId, loadFileSources, refreshUsage]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let result = rows;
    if (q) {
      result = result.filter((r) => fileNameFromRow(r).toLowerCase().includes(q));
    }
    const cmp = makeSortComparator<FileSourceRow>(
      sortKey,
      (r) => r.status,
      (r) => r.last_indexed_at
    );
    if (cmp) result = [...result].sort(cmp);
    return result;
  }, [rows, searchQuery, sortKey]);

  useEffect(() => {
    if (!highlightSourceId || loading) return;
    if (!rows.some((r) => r.id === highlightSourceId)) return;
    queueMicrotask(() => {
      document.getElementById(`knowledge-source-${highlightSourceId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }, [highlightSourceId, rows, loading]);

  const allFilteredSelected =
    filteredRows.length > 0 && filteredRows.every((r) => selected.has(r.id));

  const toggleSelectAll = () => {
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
  };

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const headerLabel =
    selected.size > 0
      ? `${selected.size} of ${rows.length} file${rows.length === 1 ? "" : "s"} selected`
      : `${rows.length} file${rows.length === 1 ? "" : "s"}`;

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (
      !window.confirm(
        `Delete ${selected.size} file source${selected.size === 1 ? "" : "s"} and all indexed data? This cannot be undone.`
      )
    ) {
      return;
    }
    setBulkDeleting(true);
    setError(null);
    try {
      for (const id of selected) {
        try {
          await backendFetch<void>(`/api/v1/knowledge/files/sources/${encodeURIComponent(id)}`, {
            method: "DELETE",
          });
        } catch (e) {
          setError(e instanceof Error ? e.message : "Delete failed");
        }
      }
      setSelected(new Set());
      if (selectedAgentId) {
        await loadFileSources?.({ silent: true });
        await refreshUsage({ silent: true });
      }
    } finally {
      setBulkDeleting(false);
    }
  }

  async function removeSource(sourceId: string) {
    if (!window.confirm("Delete this file source and all indexed data? This cannot be undone.")) return;
    setDeletingId(sourceId);
    setError(null);
    try {
      await backendFetch<void>(`/api/v1/knowledge/files/sources/${encodeURIComponent(sourceId)}`, {
        method: "DELETE",
      });
      if (!selectedAgentId) return;
      await loadFileSources?.({ silent: true });
      setSelected((prev) => {
        const n = new Set(prev);
        n.delete(sourceId);
        return n;
      });
      await refreshUsage({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete file source");
    } finally {
      setDeletingId(null);
      setMenuOpenId(null);
    }
  }

  async function uploadFiles(selectedFiles: FileList | null) {
    if (!selectedFiles || !selectedAgentId || selectedFiles.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("agent_id", selectedAgentId);
      Array.from(selectedFiles).forEach((file) => form.append("files", file));
      const uploadRes = await backendFetch<{ results: FileUploadResult[] }>("/api/v1/knowledge/files/upload", {
        method: "POST",
        body: form,
      });
      const failed = (uploadRes.results ?? []).filter((item) => item.status === "failed");
      if (failed.length > 0) {
        const first = failed[0]?.error_message ?? "One or more files failed to upload.";
        setError(`${failed.length} file${failed.length === 1 ? "" : "s"} failed: ${first}`);
      }
    } catch (e) {
      if (e instanceof BackendApiError && e.code === "knowledge.storage_budget_exhausted") {
        setError(
          "This agent’s knowledge storage is full (website + files share one limit). Delete a source or upgrade your plan, then try again."
        );
      } else if (e instanceof BackendApiError && e.code === "knowledge.embedding_not_configured") {
        setError("Indexing is not set up on the server. Contact support.");
      } else {
        setError(e instanceof Error ? e.message : "File upload failed");
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    if (selectedAgentId) {
      void loadFileSources?.({ silent: true });
      void refreshUsage({ silent: true });
    }
  }

  return (
    <KnowledgeWorkspaceShell>
      <main className="ds-app-page-scroll ds-app-page-scroll--mobile-dock min-w-0 flex-1 overflow-y-auto overscroll-y-contain">
        <KnowledgeMobileSubnav active="files" />
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="ds-app-page-title">Files</h1>
              <p className="ds-app-page-description ds-app-page-description--wide">
                Upload documents to train your agent. Supports .pdf, .txt, .doc, and .docx.
              </p>
            </div>
          </div>

          <CollapsibleSection
            title="Add a file"
            hideTitle
            headerClassName="bg-transparent py-1"
            headerContent={<div className="text-sm font-semibold text-ds-on-surface">Upload files</div>}
            defaultExpanded
          >
            <div
              className="cursor-pointer p-6 text-center transition-colors hover:bg-ds-sidebar/30"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void uploadFiles(e.dataTransfer.files);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.txt,.doc,.docx"
                onChange={(e) => {
                  void uploadFiles(e.target.files);
                }}
              />
              <div className="border-ds-outline mx-auto mb-4 flex flex-col items-center justify-center rounded-ds-xl border-2 border-dashed bg-ds-surface/80 p-8 text-center hover:border-black/45">
                <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-ds-sidebar ring-1 ring-ds-outline transition-transform hover:scale-105">
                  <IconCloudUpload className="text-ds-primary size-5" />
                </div>
                <p className="ds-app-card-title">
                  {uploading ? "Uploading and indexing files..." : "Drag and drop documents here or click to browse."}
                </p>
                <p className="ds-app-body-muted mt-1">
                Max 50MB per file. PDF, TXT, DOC, DOCX. Indexing can take up to a minute.
                </p>
              </div>
            </div>
          </CollapsibleSection>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="ds-app-section-title">File sources</h2>
              <KnowledgeSearchInput
                placeholder="Search files…"
                className="w-full sm:w-72"
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>
            <div className="border-ds-outline flex items-center justify-between border-b pb-2">
              <label className="text-ds-on-surface flex cursor-pointer items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  className="border-ds-outline size-4 rounded"
                  checked={allFilteredSelected}
                  onChange={toggleSelectAll}
                  aria-label="Select all"
                />
                <span>Select all</span>
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
                  <span className="ds-app-body-muted font-medium">{headerLabel}</span>
                )}
                <KnowledgeSortMenu value={sortKey} onChange={setSortKey} />
              </div>
            </div>

            {!agentsLoading && !selectedAgentId ? (
              <DashboardSelectAgentEmptyState />
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="ds-app-kicker bg-ds-sidebar/80 text-ds-on-surface-variant">
                    <th className="w-10 px-5 py-3 sm:px-6" />
                    <th className="px-4 py-3 font-semibold">File name</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Characters</th>
                    <th className="px-4 py-3 font-semibold">Last updated</th>
                    <th className="px-5 py-3 text-right font-semibold sm:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-ds-outline divide-y">
                  {loading ? (
                    <KnowledgeFilesTableSkeleton rows={6} />
                  ) : visibleError ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-sm text-red-700">
                        {visibleError}
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6">
                        <div className="bg-ds-app-canvas px-4 py-6 text-center">
                          <p className="text-ds-on-surface text-sm font-medium">
                            {searchQuery.trim() ? "No matching files" : "No file sources yet"}
                          </p>
                          <p className="ds-app-body-muted mx-auto mt-1 max-w-md">
                            {searchQuery.trim()
                              ? "Try another search or clear filters."
                              : "Upload documents above so your agent can retrieve them in conversations."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr
                        key={row.id}
                        id={`knowledge-source-${row.id}`}
                        className={cn(
                          "bg-ds-app-canvas transition-colors hover:bg-ds-nav-active/40",
                          highlightSourceId === row.id && "ring-2 ring-ds-primary/40 ring-inset"
                        )}
                      >
                        <td className="px-5 py-4 sm:px-6">
                          <input
                            type="checkbox"
                            className="border-ds-outline size-4 rounded"
                            checked={selected.has(row.id)}
                            onChange={() => toggleOne(row.id)}
                            aria-label={`Select ${fileNameFromRow(row)}`}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <IconFile className="text-ds-on-surface-variant size-5 shrink-0" />
                            <span className="text-ds-on-surface text-sm font-medium">{fileNameFromRow(row)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-xs">
                          {(() => {
                            const s = sourceStatusPill(row.status);
                            return <StatusPill label={s.label} tone={s.tone} />;
                          })()}
                        </td>
                        <td className="ds-app-body-muted px-4 py-4 font-mono">
                          {row.character_count.toLocaleString()}
                        </td>
                        <td className="ds-app-body-muted px-4 py-4">
                          {formatLocaleDateTime(row.last_indexed_at, localeReady)}
                        </td>
                        <td className="px-5 py-4 text-right sm:px-6">
                          <div className="relative inline-flex">
                            <button
                              type="button"
                              className="text-ds-on-surface-variant hover:text-ds-on-surface cursor-pointer rounded-ds-md p-1"
                              aria-label="More"
                              onClick={() => setMenuOpenId((prev) => (prev === row.id ? null : row.id))}
                            >
                              <IconMoreVertical className="size-5" />
                            </button>
                            {menuOpenId === row.id ? (
                              <div className="border-ds-outline bg-ds-surface absolute top-full right-0 z-50 mt-1 min-w-[10rem] rounded-ds-md border py-1 shadow-lg">
                                <button
                                  type="button"
                                  disabled={deletingId === row.id}
                                  className="text-ds-on-surface hover:bg-ds-sidebar block w-full px-3 py-2 text-left text-sm disabled:opacity-60"
                                  onClick={() => void removeSource(row.id)}
                                >
                                  {deletingId === row.id ? "Deleting..." : "Delete file"}
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
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
