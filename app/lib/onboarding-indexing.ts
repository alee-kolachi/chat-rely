import { formatStorageBytes } from "@/lib/plan-entitlements";

export type IndexingJobPayload = Record<string, unknown> | null | undefined;

export type OnboardingIndexingSnapshot = {
  status: string;
  running: boolean;
  failed: boolean;
  succeeded: boolean;
  /** Plan storage cap hit during website import; remaining pages were skipped. */
  storageLimitReached: boolean;
  /** Human-readable plan cap, e.g. "500 KB". */
  storageLimitLabel: string | null;
  /** Safe to test the agent with site knowledge (at least one page indexed). */
  readyForPreview: boolean;
  pct: number;
  headline: string;
  detail: string;
  pagesProcessed: number;
  pagesTotal: number;
  chunksEmbedded: number;
  chunksTotal: number;
};

function jobMetrics(job: IndexingJobPayload): Record<string, unknown> {
  const raw = job?.metrics;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      /* ignore malformed metrics */
    }
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function planStorageCapBytes(job: IndexingJobPayload): number {
  const metrics = jobMetrics(job);
  return Number(job?.plan_storage_cap_bytes) || Number(metrics.plan_storage_cap_bytes) || 0;
}

function crawlStoppedForBudget(job: IndexingJobPayload): boolean {
  return String(jobMetrics(job).crawl_stopped_reason ?? "") === "budget";
}

function crawlBytesUsed(job: IndexingJobPayload): number {
  return Number(jobMetrics(job).crawl_http_bytes) || 0;
}

export function onboardingStorageLimitLabel(job: IndexingJobPayload): string | null {
  const cap = planStorageCapBytes(job);
  if (cap > 0) return formatStorageBytes(cap);
  return null;
}

export function onboardingStorageLimitReached(
  job: IndexingJobPayload,
  pagesProcessed: number,
  pagesTotal: number,
): boolean {
  if (job?.storage_limit_reached === true) return true;

  if (pagesProcessed <= 0) return false;
  if (pagesTotal > 0 && pagesProcessed >= pagesTotal) return false;

  if (crawlStoppedForBudget(job)) return true;

  const planCap = planStorageCapBytes(job);
  if (planCap > 0 && crawlBytesUsed(job) >= planCap * 0.9) {
    return true;
  }

  return false;
}

function storageLimitHeadline(label: string | null): string {
  return label ? `${label} limit reached` : "Storage limit reached";
}

export function parseOnboardingIndexingJob(job: IndexingJobPayload): OnboardingIndexingSnapshot {
  if (!job) {
    return {
      status: "idle",
      running: false,
      failed: false,
      succeeded: false,
      storageLimitReached: false,
      storageLimitLabel: null,
      readyForPreview: false,
      pct: 0,
      headline: "",
      detail: "",
      pagesProcessed: 0,
      pagesTotal: 0,
      chunksEmbedded: 0,
      chunksTotal: 0,
    };
  }

  const status = String(job.status ?? "").toLowerCase();
  const running = status === "queued" || status === "running";
  const failed = status === "failed";
  const succeeded = status === "succeeded";
  const pagesTotal = Number(job.pages_total) || 0;
  const pagesProcessed = Number(job.pages_processed) || 0;
  const chunksTotal = Number(job.chunks_total) || 0;
  const chunksEmbedded = Number(job.chunks_embedded) || 0;
  const jobProgress = Number(job.progress_pct);
  const storageLimitLabel = onboardingStorageLimitLabel(job);
  const storageLimitReached = onboardingStorageLimitReached(job, pagesProcessed, pagesTotal);

  let pct = 0;
  if (storageLimitReached) {
    pct = 100;
  } else if (succeeded) {
    pct = 100;
  } else if (Number.isFinite(jobProgress) && jobProgress > 0) {
    pct = Math.min(100, Math.round(jobProgress));
  } else if (pagesTotal > 0) {
    pct = Math.min(100, Math.round((pagesProcessed / pagesTotal) * 100));
  }

  const readyForPreview =
    succeeded ||
    failed ||
    storageLimitReached ||
    (pagesProcessed >= 1 && chunksEmbedded >= 1) ||
    pct >= 25;

  let headline = "";
  let detail = "";

  if (storageLimitReached) {
    headline = storageLimitHeadline(storageLimitLabel);
    detail =
      pagesProcessed > 0
        ? `${pagesProcessed} page${pagesProcessed === 1 ? "" : "s"} ready for chat. Upgrade to import more.`
        : storageLimitLabel
          ? `Your plan includes ${storageLimitLabel} of training content. Upgrade to import more.`
          : "Your plan storage cap was reached. Upgrade to import more site content.";
  } else if (succeeded) {
    headline = "Website import complete";
    detail =
      pagesTotal > 0
        ? `${pagesTotal} page${pagesTotal === 1 ? "" : "s"} ready for chat.`
        : "Your site content is ready for chat.";
  } else if (failed) {
    headline = "Website import had an issue";
    detail =
      typeof job.error_message === "string" && job.error_message.trim()
        ? job.error_message.trim()
        : "You can retry from Knowledge Base later. Testing may use partial content.";
  } else if (running || status === "queued") {
    if (pagesTotal > 0) {
      headline = `Reading your site (${pagesProcessed} of ${pagesTotal} pages)`;
    } else {
      headline = "Reading your site…";
    }
    if (chunksEmbedded > 0 && chunksTotal > 0) {
      detail = `${chunksEmbedded} of ${chunksTotal} sections ready for chat.`;
    } else if (pagesProcessed > 0) {
      detail = `${pagesProcessed} page${pagesProcessed === 1 ? "" : "s"} ready for chat so far.`;
    } else {
      detail = "";
    }
  }

  return {
    status,
    running,
    failed,
    succeeded,
    storageLimitReached,
    storageLimitLabel,
    readyForPreview,
    pct,
    headline,
    detail,
    pagesProcessed,
    pagesTotal,
    chunksEmbedded,
    chunksTotal,
  };
}
