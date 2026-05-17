"use client";

import Link from "next/link";
import { useMeContext } from "@/components/layout/me-context-provider";

type UsageSnapshot = {
  included_conversations: number;
  conversations_used: number;
  overage_conversations: number;
  estimated_overage_cents: number;
  throttle_tier: string;
};

type MeContextPayload = {
  plan: { name: string; included_conversations: number };
  usage_snapshot: UsageSnapshot | null;
};

export function UsagePlanBanner() {
  const { data } = useMeContext();
  const ctx = data as MeContextPayload | null;

  const snap = ctx?.usage_snapshot;
  if (!snap) {
    return null;
  }

  const overIncluded = snap.conversations_used > snap.included_conversations;
  const notNormal = snap.throttle_tier !== "normal";
  if (!overIncluded && !notNormal) {
    return null;
  }

  const beyondIncluded = Math.max(0, snap.conversations_used - snap.included_conversations);

  return (
    <div
      className={`rounded-ds-xl border p-4 text-sm shadow-sm ${
        snap.throttle_tier === "strong"
          ? "border-amber-300/80 bg-amber-50 text-amber-950"
          : "border-ds-outline bg-ds-sidebar/80 text-ds-on-surface"
      }`}
    >
      <p className="font-semibold">Plan usage ({ctx?.plan.name ?? "Current plan"})</p>
      <p className="text-ds-on-surface-variant mt-1 leading-relaxed">
        {snap.conversations_used.toLocaleString()} conversations used this period
        {` · `}
        {snap.included_conversations.toLocaleString()} included
        {beyondIncluded > 0
          ? ` · ${beyondIncluded.toLocaleString()} above included. Chat stays on; replies may be slower`
          : ""}
      </p>
      {snap.throttle_tier === "strong" ? (
        <p className="ds-app-body-muted mt-1">
          Heavy usage this period: we never turn off chat, but responses may take longer.
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <Link href="/usage" className="text-ds-primary text-sm font-semibold hover:underline">
          View usage details
        </Link>
        <Link href="/pricing" className="text-ds-primary text-sm font-semibold hover:underline">
          Compare plans
        </Link>
      </div>
    </div>
  );
}
