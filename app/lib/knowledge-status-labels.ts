/** Merchant-facing labels for knowledge source and page statuses. */

export type KnowledgePillTone = "neutral" | "success" | "warning" | "danger" | "info";

export type KnowledgeStatusPill = { label: string; tone: KnowledgePillTone };

/** File, snippet, Q&A, and website source rows. */
export function knowledgeSourceStatusPill(status: string | null | undefined): KnowledgeStatusPill {
  switch ((status ?? "").toLowerCase()) {
    case "ready":
      return { label: "Ready for chat", tone: "success" };
    case "failed":
      return { label: "Failed", tone: "danger" };
    case "indexing":
      return { label: "Updating", tone: "warning" };
    case "pending":
      return { label: "Waiting", tone: "neutral" };
    case "skipped_duplicate":
      return { label: "Skipped (duplicate)", tone: "warning" };
    default:
      return { label: "Waiting", tone: "neutral" };
  }
}

/** One URL row under a website source. */
export function knowledgePageStatusPill(status: string | null | undefined): KnowledgeStatusPill {
  switch ((status ?? "").toLowerCase()) {
    case "parsed":
      return { label: "Ready for chat", tone: "success" };
    case "fetched":
      return { label: "Processing", tone: "info" };
    case "failed":
      return { label: "Failed", tone: "danger" };
    case "queued":
      return { label: "Waiting", tone: "neutral" };
    case "excluded":
      return { label: "Skipped (path rule)", tone: "warning" };
    default:
      return { label: "Waiting", tone: "neutral" };
  }
}

function websiteJobPhaseLabel(phase: string, jobStatus: string | null | undefined): string {
  switch (phase.toLowerCase()) {
    case "complete":
      return (jobStatus ?? "").toLowerCase() === "succeeded" ? "Ready for chat" : "Finished";
    case "crawling":
      return "Reading pages";
    case "chunking":
      return "Organizing content";
    case "embedding":
    case "embedding_queued":
      return "Updating search index";
    case "failed":
      return "Failed";
    case "queued":
      return "Waiting to start";
    default:
      return "In progress";
  }
}

/** Short status fragment on website source list rows. */
export function websiteSourceStatusLabel(opts: {
  sourceStatus: string;
  jobPhase: string | null | undefined;
  jobStatus: string | null | undefined;
  reindexedDuplicate: boolean;
}): string {
  if (opts.reindexedDuplicate) return "Already ready for chat";
  const source = (opts.sourceStatus ?? "").toLowerCase();
  if (source === "skipped_duplicate") return "Skipped (duplicate)";
  const phase = (opts.jobPhase ?? "").trim();
  if (phase) return websiteJobPhaseLabel(phase, opts.jobStatus);
  if (source === "indexing") return "Updating for chat";
  if (source === "ready") return "Ready for chat";
  if (source === "failed") return "Failed";
  return "";
}

export function formatKnowledgeLastUpdatedRelative(iso: string | null | undefined): string {
  if (!iso) return "Not ready for chat yet";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "Not ready for chat yet";
  const diff = Date.now() - t;
  const days = Math.floor(diff / (86400 * 1000));
  if (days >= 1) return `Updated for chat ${days}d ago`;
  const hours = Math.floor(diff / (3600 * 1000));
  if (hours >= 1) return `Updated for chat ${hours}h ago`;
  return "Updated for chat recently";
}

/** Progress suffix while a website job runs or after it completes. */
export function websiteCrawlProgressSuffix(jobComplete: boolean): string {
  return jobComplete ? "ready for chat" : "pages read";
}
