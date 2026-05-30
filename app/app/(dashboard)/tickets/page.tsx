"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { backendFetch } from "@/lib/backend-api";
import { appButtonClassName } from "@/lib/button-styles";
import { cn } from "@/lib/utils";

type TicketRow = {
  id: string;
  agent_id: string;
  conversation_id: string;
  subject: string | null;
  status: string;
  priority: string;
  customer_email: string | null;
  updated_at: string;
};

const STATUS_FILTER_OPTIONS = ["", "open", "pending_customer", "resolved"] as const;
type StatusFilter = (typeof STATUS_FILTER_OPTIONS)[number];

function ticketStatusLabel(status: string): string {
  if (status === "pending_customer") return "Awaiting customer";
  if (status === "open") return "Open";
  if (status === "resolved") return "Resolved";
  return status;
}

function filterLabel(status: StatusFilter): string | null {
  if (status === "open") return "Open human escalations";
  if (status === "pending_customer") return "Awaiting customer reply";
  if (status === "resolved") return "Resolved";
  return null;
}

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

function TicketsPageContent() {
  const searchParams = useSearchParams();
  const statusParam = (searchParams.get("status") ?? "").trim();
  const statusFilter: StatusFilter = STATUS_FILTER_OPTIONS.includes(statusParam as StatusFilter)
    ? (statusParam as StatusFilter)
    : "";

  const { selectedAgentId } = useDashboardAgent();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeFilterLabel = filterLabel(statusFilter);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (selectedAgentId != null && selectedAgentId !== "") {
        qs.set("agent_id", selectedAgentId);
      }
      if (statusFilter) qs.set("status", statusFilter);
      const query = qs.toString();
      const data = await backendFetch<{ tickets: TicketRow[]; total: number }>(
        `/api/v1/tickets${query ? `?${query}` : ""}`
      );
      setTickets(data.tickets);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [selectedAgentId, statusFilter]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const openCount = useMemo(() => tickets.filter((t) => t.status === "open").length, [tickets]);
  const awaitingCount = useMemo(
    () => tickets.filter((t) => t.status === "pending_customer").length,
    [tickets]
  );

  function conversationHref(ticket: TicketRow): string {
    const qs = new URLSearchParams({
      conversation: ticket.conversation_id,
      agent: ticket.agent_id,
    });
    return `/conversations?${qs.toString()}`;
  }

  return (
    <div className="ds-app-shell p-6 md:p-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="ds-app-page-title">Tickets</h1>
            <p className="ds-app-page-description ds-app-page-description--wide">
              Human escalations from chat. Open a thread in Conversations to reply.
            </p>
            {activeFilterLabel ? (
              <p className="text-ds-on-surface-variant mt-2 text-sm">
                Showing: <span className="text-ds-on-surface font-semibold">{activeFilterLabel}</span>
                {" · "}
                <Link href="/tickets" className="text-ds-primary font-semibold hover:underline">
                  Clear filter
                </Link>
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className={appButtonClassName()}
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
          <Link
            href="/tickets?status=open"
            className={cn(
              "border-ds-outline rounded-ds-xl border bg-ds-surface p-5 shadow-sm transition-colors hover:bg-ds-sidebar/50",
              statusFilter === "open" && "ring-ds-primary ring-2"
            )}
          >
            <p className="text-ds-on-surface-variant text-sm font-medium">Open</p>
            <TicketMetricValue loading={loading} value={openCount} />
          </Link>
          <Link
            href="/tickets?status=pending_customer"
            className={cn(
              "border-ds-outline rounded-ds-xl border bg-ds-surface p-5 shadow-sm transition-colors hover:bg-ds-sidebar/50",
              statusFilter === "pending_customer" && "ring-ds-primary ring-2"
            )}
          >
            <p className="text-ds-on-surface-variant text-sm font-medium">Awaiting customer</p>
            <TicketMetricValue loading={loading} value={awaitingCount} />
          </Link>
        </section>

        <section className="border-ds-outline overflow-hidden rounded-ds-xl border bg-ds-surface shadow-sm">
          <div className="border-ds-outline bg-ds-sidebar/90 flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <h2 className="ds-app-kicker text-ds-on-surface font-semibold">Queue</h2>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["", "All"],
                  ["open", "Open"],
                  ["pending_customer", "Awaiting customer"],
                  ["resolved", "Resolved"],
                ] as const
              ).map(([value, label]) => {
                const href = value ? `/tickets?status=${encodeURIComponent(value)}` : "/tickets";
                const active = statusFilter === value;
                return (
                  <Link
                    key={value || "all"}
                    href={href}
                    className={appButtonClassName("segment", {
                      size: "sm",
                      selected: active,
                      className: "text-xs",
                    })}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="divide-ds-outline divide-y">
            {loading ? (
              <TicketsQueueSkeleton />
            ) : tickets.length === 0 ? (
              <p className="text-ds-on-surface-variant p-4 text-sm">
                {activeFilterLabel
                  ? `No tickets in “${activeFilterLabel}”.`
                  : "No tickets yet. Escalations appear when the AI hands off and “Escalate to Human” is enabled for this agent."}
              </p>
            ) : (
              tickets.map((t) => (
                <Link
                  key={t.id}
                  href={conversationHref(t)}
                  className="hover:bg-ds-sidebar/40 grid grid-cols-1 gap-2 px-4 py-3 transition-colors md:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0">
                    <p className="text-ds-on-surface truncate text-sm font-semibold">{t.subject ?? "Ticket"}</p>
                    <p className="ds-app-body-muted truncate">
                      {t.customer_email ?? "No email captured"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "self-center rounded-ds-md px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase md:justify-self-end",
                      t.status === "open"
                        ? "bg-amber-100 text-amber-900"
                        : t.status === "pending_customer"
                          ? "bg-ds-sidebar text-ds-on-surface-variant ring-1 ring-ds-outline"
                          : "bg-ds-sidebar text-ds-on-surface-variant"
                    )}
                  >
                    {ticketStatusLabel(t.status)}
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function TicketsPage() {
  return (
    <Suspense
      fallback={
        <div className="ds-app-shell text-ds-on-surface-variant flex min-h-0 flex-1 flex-col p-6 text-sm md:p-8">
          Loading…
        </div>
      }
    >
      <TicketsPageContent />
    </Suspense>
  );
}
