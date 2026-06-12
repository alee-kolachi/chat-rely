"use client";

import Link from "next/link";

import { ChartAreaSkeleton, type ChartAreaSkeletonProps } from "@/components/dashboard/chart-area-skeleton";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { appButtonClassName } from "@/lib/button-styles";
import { cn } from "@/lib/utils";

/** Loading and empty UI for the dashboard metrics screen. */

export function DashboardMetricValueSkeleton({ className }: { className?: string }) {
  return (
    <span
      className={cn("ds-skeleton mt-2 inline-block h-9 w-[5rem] max-w-[55%]", className)}
      aria-hidden
    />
  );
}

export function DashboardChartSkeleton(props?: ChartAreaSkeletonProps) {
  return <ChartAreaSkeleton {...(props ?? {})} />;
}

export function DashboardQueueAsideSkeleton() {
  return (
    <ul className="divide-ds-outline divide-y" aria-hidden>
      {[1, 2].map((i) => (
        <li key={i} className="flex items-center justify-between gap-3 px-1 py-3">
          <div className="ds-skeleton h-4 w-[58%] max-w-[14rem]" />
          <div className="ds-skeleton h-6 w-10 shrink-0" />
        </li>
      ))}
    </ul>
  );
}

export function DashboardRecentTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          <td className="py-3 pr-2">
            <div className="ds-skeleton h-4 w-24" />
          </td>
          <td className="max-w-[200px] py-3 pr-2">
            <div className="ds-skeleton h-4 w-full" />
          </td>
          <td className="py-3 pr-2">
            <div className="ds-skeleton h-6 w-20" />
          </td>
          <td className="py-3 text-right">
            <div className="ds-skeleton ml-auto h-3 w-12" />
          </td>
        </tr>
      ))}
    </>
  );
}

export function DashboardTrainingTopicsSkeleton({ blocks = 4 }: { blocks?: number }) {
  return (
    <ul className="divide-ds-outline divide-y" aria-hidden>
      {Array.from({ length: blocks }).map((_, i) => (
        <li key={i} className="flex items-center justify-between gap-3 px-1 py-2.5">
          <div className="ds-skeleton h-4 w-[72%] max-w-[14rem]" />
          <div className="ds-skeleton h-3 w-20 shrink-0" />
        </li>
      ))}
    </ul>
  );
}

export function DashboardSelectAgentEmptyState() {
  const { agents } = useDashboardAgent();
  const noAgents = agents.length === 0;

  return (
    <section className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm md:p-8">
      <div className="mx-auto flex max-w-lg flex-col items-center text-center">
        <div
          className="mb-4 flex size-14 items-center justify-center rounded-full bg-ds-sidebar ring-1 ring-ds-outline"
          aria-hidden
        >
          <svg
            className="text-ds-on-surface-variant size-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <h2 className="ds-app-section-title text-lg md:text-xl">
          {noAgents ? "Create your first agent" : "Choose an agent"}
        </h2>
        <p className="text-ds-on-surface-variant mt-2 text-sm leading-relaxed md:text-base">
          {noAgents
            ? "Use New agent in the header to add a workspace. Each agent gets its own embed key and settings."
            : "Pick an agent from the Agent menu in the header to load metrics, charts, and conversations for that workspace."}
        </p>
      </div>
    </section>
  );
}

export function DashboardChartEmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-2 px-4 text-center">
      <div
        className="text-ds-on-surface-variant flex size-11 items-center justify-center rounded-full bg-ds-sidebar ring-1 ring-ds-outline"
        aria-hidden
      >
        <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
        </svg>
      </div>
      <p className="text-ds-on-surface text-sm font-medium">{message}</p>
      <p className="ds-app-body-muted max-w-xs">
        Try widening the date range or check back after new chats arrive.
      </p>
    </div>
  );
}

export function DashboardRecentConversationsEmptyState() {
  return (
    <tr>
      <td colSpan={4} className="py-10">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center">
          <div
            className="text-ds-on-surface-variant flex size-10 items-center justify-center rounded-full bg-ds-sidebar ring-1 ring-ds-outline"
            aria-hidden
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
              />
            </svg>
          </div>
          <p className="text-ds-on-surface text-sm font-medium">No recent conversations</p>
          <p className="ds-app-body-muted max-w-sm">
            Nothing in this window yet. Traffic will appear here once customers start chats.
          </p>
          <Link href="/deploy" className="text-ds-primary mt-1 text-sm font-semibold hover:underline">
            Review deploy settings
          </Link>
        </div>
      </td>
    </tr>
  );
}

export function DashboardTrainingTopicsEmptyState() {
  return (
    <div className="border-ds-outline rounded-ds-lg border border-dashed bg-ds-sidebar/40 px-4 py-8 text-center">
      <div
        className="text-ds-on-surface-variant mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-ds-surface ring-1 ring-ds-outline"
        aria-hidden
      >
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <p className="text-ds-on-surface text-sm font-medium">No source suggestions for this range</p>
      <p className="ds-app-body-muted mx-auto mt-1 max-w-[18rem]">
        When chats show missing coverage, suggested topics appear here. Add snippets, Q&amp;A, or pages in Knowledge.
      </p>
    </div>
  );
}

import { PlanCrownIcon } from "@/components/ui/plan-tier-badge";

/** Shown when Source suggestions are a Standard / Pro feature for this workspace. */
export function DashboardSourceSuggestionsPlanGate() {
  return (
    <div className="border-ds-outline rounded-ds-lg border border-dashed bg-ds-sidebar/40 px-4 py-8 text-center">
      <div
        className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-ds-surface ring-1 ring-ds-outline"
        aria-hidden
      >
        <PlanCrownIcon className="size-5" title="Not on your plan" />
      </div>
      <p className="text-ds-on-surface text-sm font-medium">Source suggestions</p>
      <p className="ds-app-body-muted mx-auto mt-1 max-w-[19rem]">
        AI highlights gaps in your knowledge sources after closures. Included on{" "}
        <span className="text-ds-on-surface font-medium">Standard</span> and{" "}
        <span className="text-ds-on-surface font-medium">Pro</span>.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <Link href="/account/plan" className={appButtonClassName()}>
          View plans
        </Link>
        <Link href="/pricing" className="text-ds-primary text-sm font-semibold hover:underline">
          Compare features
        </Link>
      </div>
    </div>
  );
}
