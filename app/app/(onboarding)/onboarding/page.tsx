"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { backendFetch } from "@/lib/backend-api";
import { saveOnboardingAgentId } from "@/lib/onboarding-state";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import {
  OnboardingFieldRow,
  OnboardingInput,
  OnboardingMainColumn,
  OnboardingPageHeader,
  OnboardingSectionCard,
  OnboardingStickyFooter,
  onboardingType,
} from "@/components/onboarding/onboarding-ui";

export default function OnboardingPage() {
  const router = useRouter();
  const [agentName, setAgentName] = useState("Aria");
  const [website, setWebsite] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewInitial = useMemo(() => {
    const value = agentName.trim();
    if (!value) return "A";
    return value.charAt(0).toUpperCase();
  }, [agentName]);

  const canContinue = agentName.trim().length > 0;

  async function handleContinue() {
    if (!canContinue || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const slug = agentName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 120);
      const created = await backendFetch<{ id: string }>("/api/v1/agents", {
        method: "POST",
        body: JSON.stringify({
          name: agentName.trim(),
          slug: slug || undefined,
          behavior_settings: website.trim() ? { primary_website: website.trim() } : {},
        }),
      });
      saveOnboardingAgentId(created.id);
      const next = new URLSearchParams({ agentId: created.id });
      if (website.trim()) next.set("website", website.trim());
      router.push(`/onboarding/knowledge-base?${next.toString()}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create agent");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <OnboardingFrame activeItem="Agent Name" stepLabel="Step 1 of 6">
      <OnboardingMainColumn>
        <OnboardingPageHeader
          kicker="Step 1 · Identity"
          title="Name your agent and add your site"
          subtitle="We use this to personalize replies and crawl your public pages for answers. You can change everything later."
        />

        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="space-y-8 lg:col-span-7">
            <OnboardingSectionCard>
              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <OnboardingFieldRow
                  id="agent-name"
                  label="Agent name"
                  hint="Shown to customers in the chat header."
                >
                  <OnboardingInput
                    id="agent-name"
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="e.g. Aria, Support, Acme Assistant"
                    autoComplete="off"
                  />
                </OnboardingFieldRow>

                <OnboardingFieldRow
                  id="website-url"
                  label="Primary website"
                  hint="We’ll crawl public pages only. Add more sources in the next step."
                >
                  <OnboardingInput
                    id="website-url"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://yourstore.com"
                    inputMode="url"
                  />
                </OnboardingFieldRow>
              </form>
            </OnboardingSectionCard>

            <p className={onboardingType.body}>
              <span className="text-ds-on-surface font-medium">Next:</span> connect knowledge sources and optional
              files. Estimated time for the full wizard: about five minutes.
            </p>
          </div>

          <div className="lg:col-span-5">
            <div className="border-ds-outline lg:sticky lg:top-20 rounded-ds-lg border bg-ds-surface p-1 shadow-sm">
              <div className="border-ds-outline rounded-ds-md border bg-white p-4">
                <p className="text-ds-on-surface-variant mb-3 text-[11px] font-semibold uppercase tracking-wider">
                  Live preview
                </p>
                <div className="border-ds-outline flex max-h-[min(520px,70vh)] flex-col overflow-hidden rounded-ds-lg border bg-white shadow-sm">
                  <div className="bg-ds-primary px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-ds-primary">
                        {previewInitial}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ds-on-primary">
                          {agentName.trim() || "Your agent"}
                        </p>
                        <p className="text-ds-on-primary/80 mt-0.5 flex items-center gap-1.5 text-[11px]">
                          <span className="size-1.5 rounded-full bg-emerald-400" />
                          Online
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 space-y-3 bg-ds-sidebar p-4">
                    <div className="flex gap-2">
                      <div className="size-6 shrink-0 rounded-full bg-ds-outline/60" aria-hidden />
                      <div className="border-ds-outline rounded-2xl rounded-tl-sm border bg-white px-3 py-2.5 text-xs leading-relaxed text-ds-on-surface">
                        Hi! I&apos;m {agentName.trim() || "your assistant"}. How can I help today?
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-ds-primary max-w-[88%] rounded-2xl rounded-tr-sm px-3 py-2.5 text-xs leading-relaxed text-ds-on-primary">
                        I need help with my order.
                      </div>
                    </div>
                  </div>
                  <div className="border-ds-outline border-t bg-white p-3">
                    <div className="flex items-center gap-2">
                      <div className="text-ds-on-surface-variant flex-1 rounded-full bg-ds-sidebar px-3 py-2 text-[11px]">
                        Type a message…
                      </div>
                      <div
                        className="bg-ds-primary text-ds-on-primary flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium"
                        aria-hidden
                      >
                        →
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </OnboardingMainColumn>

      <OnboardingStickyFooter
        primaryAsButton
        onPrimaryClick={handleContinue}
        primaryLabel={isSaving ? "Saving..." : "Continue"}
        primaryDisabled={!canContinue}
        tertiary={
          <div className="hidden md:block">
            {error ? (
              <span className="text-xs font-medium text-rose-600">{error}</span>
            ) : (
              <span className="text-ds-on-surface-variant text-[11px] font-medium">
                {!canContinue ? "Enter a name to continue" : "Creates your first agent"}
              </span>
            )}
          </div>
        }
      />
    </OnboardingFrame>
  );
}
