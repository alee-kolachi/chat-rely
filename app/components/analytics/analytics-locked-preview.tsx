/** Static placeholders shown inside grayed-out analytics sections. */

export function AnalyticsLockedIntentPreview() {
  return (
    <div className="space-y-3" aria-hidden>
      {["Order status", "Product question", "Returns"].map((label) => (
        <div
          key={label}
          className="border-ds-outline flex items-center justify-between rounded-ds-lg border bg-ds-sidebar/60 px-4 py-3"
        >
          <div>
            <p className="ds-app-card-title">{label}</p>
            <p className="ds-app-body-muted">— conversations</p>
          </div>
          <span className="ds-app-body-muted font-semibold">-</span>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsLockedCountryPreview() {
  return (
    <div className="space-y-4" aria-hidden>
      {[
        { code: "US", pct: 72 },
        { code: "CA", pct: 48 },
        { code: "GB", pct: 31 },
      ].map((row) => (
        <div key={row.code} className="flex items-center gap-4">
          <span className="ds-app-body-muted w-12 shrink-0 font-semibold">{row.code}</span>
          <div className="bg-ds-outline/60 h-2.5 min-w-0 flex-1 overflow-hidden rounded-full">
            <div className="bg-ds-secondary h-full rounded-full" style={{ width: `${row.pct}%` }} />
          </div>
          <span className="text-ds-on-surface w-10 shrink-0 text-right text-xs font-semibold">—</span>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsLockedSentimentPreview() {
  return (
    <div
      className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center xl:justify-start"
      aria-hidden
    >
      <div className="relative h-44 w-44 shrink-0">
        <svg className="h-full w-full" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={40} fill="transparent" stroke="var(--ds-outline)" strokeWidth="10" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="ds-app-metric-value text-2xl">—</span>
          <span className="ds-app-kicker">Positive</span>
        </div>
      </div>
      <div className="w-full min-w-0 flex-1 space-y-3 sm:max-w-md">
        {["Positive", "Neutral", "Negative"].map((label) => (
          <div key={label} className="flex items-center gap-3">
            <span className="bg-ds-outline size-3 shrink-0 rounded-full" />
            <span className="text-ds-on-surface flex-1 text-sm font-medium">{label}</span>
            <span className="ds-app-card-title">—</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsLockedQualityPreview() {
  return (
    <div className="space-y-3" aria-hidden>
      {[
        { label: "Avg resolution confidence", hint: "From end-of-conversation analysis." },
        { label: "Resolved without escalation", hint: "AI marked resolved and not escalated." },
        { label: "Turns flagged knowledge gap", hint: "Share of replies with a gap signal." },
      ].map((row) => (
        <div
          key={row.label}
          className="border-ds-outline flex flex-col gap-1 rounded-ds-lg border bg-ds-sidebar/60 px-4 py-3"
        >
          <div className="flex items-baseline justify-between gap-2">
            <p className="ds-app-card-title">{row.label}</p>
            <p className="text-ds-on-surface shrink-0 text-sm font-semibold tabular-nums">—</p>
          </div>
          <p className="ds-app-body-muted">{row.hint}</p>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsLockedFeedbackPreview() {
  return (
    <div aria-hidden>
      <p className="ds-app-body-muted mb-4 max-w-3xl">
        Thumbs on assistant replies in the widget. Mark resolved after you fix an issue.
      </p>
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {["Thumbs up", "Open thumbs down", "Resolved thumbs down"].map((label) => (
          <div key={label} className="border-ds-outline rounded-ds-lg border bg-ds-sidebar/50 px-4 py-3">
            <p className="ds-app-body-muted font-medium">{label}</p>
            <p className="ds-app-metric-value mt-1 text-xl">—</p>
          </div>
        ))}
      </div>
      <p className="text-ds-on-surface-variant text-sm">Open thumbs-down replies appear here.</p>
    </div>
  );
}
