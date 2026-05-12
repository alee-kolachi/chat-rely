"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { backendFetch } from "@/lib/backend-api";
import { cn } from "@/lib/utils";

type TicketRow = {
  id: string;
  conversation_id: string;
  subject: string | null;
  status: string;
  priority: string;
  customer_email: string | null;
  updated_at: string;
};

function TicketMetricValue({ loading, value }: { loading: boolean; value: number }) {
  if (loading) {
    return <div className="bg-ds-sidebar mt-3 h-8 w-12 animate-pulse rounded-md" aria-label="Loading metric" />;
  }
  return <p className="ds-app-metric-value mt-2">{value}</p>;
}

function TicketsQueueSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-3" aria-label="Loading tickets">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="bg-ds-sidebar h-14 animate-pulse rounded-lg" />
      ))}
    </div>
  );
}

export default function TicketsPage() {
  const { selectedAgentId } = useDashboardAgent();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs =
        selectedAgentId != null && selectedAgentId !== ""
          ? `?agent_id=${encodeURIComponent(selectedAgentId)}`
          : "";
      const data = await backendFetch<{ tickets: TicketRow[]; total: number }>(`/api/v1/tickets${qs}`);
      setTickets(data.tickets);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [selectedAgentId]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const openCount = tickets.filter((t) => t.status === "open").length;

  return (
    <div className="ds-app-shell p-6 md:p-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="ds-app-page-title">Tickets</h1>
            <p className="ds-app-page-description ds-app-page-description--wide">
              Human escalations from chat. Open a thread in Conversations to reply.
            </p>
          </div>
          <button
            type="button"
            className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar rounded-ds-md border bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors"
            onClick={() => void load()}
          >
            Refresh
          </button>
        </header>

        {error ? <p className="mb-4 text-sm text-rose-600">{error}</p> : null}

        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="border-ds-outline rounded-ds-xl border bg-ds-surface p-5 shadow-sm">
            <p className="text-ds-on-surface-variant text-sm font-medium">Total</p>
            <TicketMetricValue loading={loading} value={total} />
          </article>
          <article className="border-ds-outline rounded-ds-xl border bg-ds-surface p-5 shadow-sm">
            <p className="text-ds-on-surface-variant text-sm font-medium">Open</p>
            <TicketMetricValue loading={loading} value={openCount} />
          </article>
        </section>

        <section className="border-ds-outline overflow-hidden rounded-ds-xl border bg-ds-surface shadow-sm">
          <div className="border-ds-outline bg-ds-sidebar/90 border-b px-4 py-3">
            <h2 className="ds-app-kicker text-ds-on-surface font-semibold">Queue</h2>
          </div>
          <div className="divide-ds-outline divide-y">
            {loading ? (
              <TicketsQueueSkeleton />
            ) : tickets.length === 0 ? (
              <p className="text-ds-on-surface-variant p-4 text-sm">
                No tickets yet. Escalations appear when the AI hands off and “Escalate to Human” is enabled for this
                agent.
              </p>
            ) : (
              tickets.map((t) => (
                <div
                  key={t.id}
                  className="hover:bg-ds-sidebar/40 grid grid-cols-1 gap-2 px-4 py-3 md:grid-cols-[1fr_auto_auto]"
                >
                  <div className="min-w-0">
                    <p className="text-ds-on-surface truncate text-xs font-semibold">{t.subject ?? "Ticket"}</p>
                    <p className="text-ds-on-surface-variant truncate text-xs">
                      {t.customer_email ?? "No email captured"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "self-center rounded-ds-md px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                      t.status === "open" ? "bg-amber-100 text-amber-900" : "bg-ds-sidebar text-ds-on-surface-variant"
                    )}
                  >
                    {t.status}
                  </span>
                  <Link
                    href={`/conversations?conversation=${encodeURIComponent(t.conversation_id)}`}
                    className="text-ds-primary self-center text-xs font-semibold hover:underline md:text-right"
                  >
                    Open chat
                  </Link>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
