export type IndexingJobPayload = Record<string, unknown> | null | undefined;

export type OnboardingIndexingSnapshot = {
  status: string;
  running: boolean;
  failed: boolean;
  succeeded: boolean;
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

export function parseOnboardingIndexingJob(job: IndexingJobPayload): OnboardingIndexingSnapshot {
  if (!job) {
    return {
      status: "idle",
      running: false,
      failed: false,
      succeeded: false,
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

  let pct = 0;
  if (succeeded) {
    pct = 100;
  } else if (Number.isFinite(jobProgress) && jobProgress > 0) {
    pct = Math.min(100, Math.round(jobProgress));
  } else if (pagesTotal > 0) {
    pct = Math.min(100, Math.round((pagesProcessed / pagesTotal) * 100));
  }

  const readyForPreview =
    succeeded || failed || (pagesProcessed >= 1 && chunksEmbedded >= 1) || pct >= 25;

  let headline = "";
  let detail = "";

  if (succeeded) {
    headline = "Website import complete";
    detail =
      pagesTotal > 0
        ? `${pagesTotal} page${pagesTotal === 1 ? "" : "s"} indexed and ready for testing.`
        : "Your site content is indexed and ready for testing.";
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
      detail = `${chunksEmbedded} of ${chunksTotal} sections indexed.`;
    } else if (pagesProcessed > 0) {
      detail = `${pagesProcessed} page${pagesProcessed === 1 ? "" : "s"} indexed so far.`;
    } else {
      detail = "";
    }
  }

  return {
    status,
    running,
    failed,
    succeeded,
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
