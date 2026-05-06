"use client";

import Link from "next/link";
import { useMeContext } from "@/components/layout/me-context-provider";

type UsageSnapshot = {
  included_conversations: number;
  billable_conversations: number;
  overage_conversations: number;
  estimated_overage_cents: number;
  throttle_tier: string;
  cushion_limit_conversations: number;
  conversations_in_free_cushion: number;
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

  const overIncluded = snap.billable_conversations > snap.included_conversations;
  const notNormal = snap.throttle_tier !== "normal";
  if (!overIncluded && !notNormal) {
    return null;
  }

  const cushionSlots = Math.max(0, snap.cushion_limit_conversations - snap.included_conversations)
  const cushionLabel =
    snap.conversations_in_free_cushion > 0 && cushionSlots > 0
      ? `Free cushion: ${snap.conversations_in_free_cushion.toLocaleString()} of ${cushionSlots.toLocaleString()} extra conversations (no paid overage in this band).`
      : null;

  const overageMoney = (snap.estimated_overage_cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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
        {snap.billable_conversations.toLocaleString()} billable conversations this period
        {` · `}
        {snap.included_conversations.toLocaleString()} included
        {snap.overage_conversations > 0
          ? ` · ${snap.overage_conversations.toLocaleString()} paid overage (~$${overageMoney} est.)`
          : ""}
        {cushionLabel ? ` ${cushionLabel}` : ""}
      </p>
      <Link href="/usage" className="text-ds-primary mt-2 inline-block text-xs font-semibold hover:underline">
        View usage details
      </Link>
    </div>
  );
}
