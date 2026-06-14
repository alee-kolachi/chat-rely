"use client";

import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { WidgetBrandAvatar } from "@/components/chat/widget-brand-avatar";
import { brandChromeClasses, parseBrandColorHex } from "@/lib/brand-chrome";
import {
  DEFAULT_WELCOME_SCREEN_HEADLINE_COLOR,
  normalizeExternalUrl,
  type WelcomeScreenSocialLink,
} from "@/lib/agent-settings";
import {
  detectWelcomeSocialPlatform,
  WelcomeSocialPlatformIcon,
} from "@/lib/welcome-social-platform";
import {
  defaultAccentPanelBackground,
  welcomePanelGradient,
} from "@/lib/widget-appearance";
import { cn } from "@/lib/utils";

export type WidgetWelcomeScreenProps = {
  agentName: string;
  brandColorHex?: string | null;
  headline: string;
  headlineColor?: string | null;
  description: string;
  buttonLabel: string;
  socialLinks: [WelcomeScreenSocialLink, WelcomeScreenSocialLink];
  websiteLogoUrl?: string | null;
  websiteLogoPending?: boolean;
  panelBackgroundHex?: string | null;
  className?: string;
  onChatClick?: () => void;
};

function isExternalUrl(url: string): boolean {
  const normalized = normalizeExternalUrl(url);
  return normalized.startsWith("http://") || normalized.startsWith("https://");
}

function WelcomeSocialCard({
  label,
  url,
  accentHex,
}: WelcomeScreenSocialLink & { accentHex: string }) {
  const clickable = isExternalUrl(url);
  const platform = detectWelcomeSocialPlatform(label, url);
  const className = cn(
    "flex items-center gap-2.5 rounded-full border border-slate-200/95 bg-white/[0.97] px-2.5 py-2 text-[13px] font-medium shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
    clickable ? "cursor-pointer hover:border-[color-mix(in_srgb,var(--cr-accent)_28%,#e2e8f0)] hover:bg-white" : "cursor-default opacity-90"
  );
  const style = { ["--cr-accent" as string]: accentHex } as CSSProperties;

  const content = (
    <>
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full"
        style={{
          background: `color-mix(in srgb, ${accentHex} 8%, #f8fafc)`,
          color: accentHex,
        }}
      >
        <WelcomeSocialPlatformIcon platform={platform} className="size-[17px]" />
      </span>
      <span className="text-ds-on-surface min-w-0 flex-1 leading-snug">{label}</span>
      <span className="inline-flex shrink-0 text-[color-mix(in_srgb,var(--cr-accent)_50%,transparent)] opacity-50">
        <ArrowRight className="size-4" strokeWidth={2.5} aria-hidden />
      </span>
    </>
  );

  if (clickable) {
    return (
      <a
        href={normalizeExternalUrl(url)}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        style={style}
      >
        {content}
      </a>
    );
  }

  return (
    <div className={className} style={style}>
      {content}
    </div>
  );
}

export function WidgetWelcomeScreen({
  agentName,
  brandColorHex,
  headline,
  headlineColor,
  description,
  buttonLabel,
  socialLinks,
  websiteLogoUrl,
  websiteLogoPending = false,
  panelBackgroundHex,
  className,
  onChatClick,
}: WidgetWelcomeScreenProps) {
  const brand = parseBrandColorHex(brandColorHex) ?? "#831C91";
  const panelBg = panelBackgroundHex?.trim() || defaultAccentPanelBackground(brand);
  const chrome = brandChromeClasses(brand);
  const hasBrand = Boolean(parseBrandColorHex(brandColorHex));
  const displayName = agentName.trim() || "Support";
  const ctaTextColor = chrome.lightBg ? "#0f172a" : "#ffffff";

  return (
    <div
      className={cn("relative flex min-h-0 flex-1 flex-col overflow-hidden", className)}
      style={{ background: welcomePanelGradient(brand, panelBg) }}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_55%_at_50%_-8%,rgba(255,255,255,0.16),transparent_62%)]"
        aria-hidden
      />

      <div className="relative flex min-h-[88px] flex-1 items-center px-5 sm:px-6">
        <h2
          className="w-full pr-9 text-[24px] font-normal leading-tight tracking-[-0.02em]"
          style={{ color: headlineColor?.trim() || DEFAULT_WELCOME_SCREEN_HEADLINE_COLOR }}
        >
          {headline}
        </h2>
      </div>

      <div className="relative z-[1] shrink-0">
        <div className="px-4 pt-0 sm:px-4">
          <div className="rounded-2xl border border-slate-200/95 bg-white/[0.97] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-3">
              <WidgetBrandAvatar
                logoUrl={websiteLogoUrl ?? null}
                logoPending={websiteLogoPending}
                hasBrand={hasBrand}
                chrome={chrome}
                brandColorHex={brand}
                size="welcome"
              />
              <div className="min-w-0 flex-1">
                <p className="text-ds-on-surface truncate text-[14px] font-bold tracking-[-0.02em]">
                  {displayName}
                </p>
                <p className="text-ds-on-surface-variant mt-1 text-[13px] leading-snug">
                  {description}
                </p>
              </div>
            </div>
            <button
              type="button"
              className={cn(
                "mt-3.5 w-full rounded-xl px-4 py-2.5 text-[14px] font-semibold transition-opacity hover:opacity-90",
                onChatClick && "cursor-pointer"
              )}
              style={{ backgroundColor: brand, color: ctaTextColor }}
              disabled={!onChatClick}
              onClick={onChatClick}
            >
              {buttonLabel}
            </button>
          </div>
        </div>

        <div className="mt-3 px-4 pb-3 sm:px-4">
          <div className="space-y-2.5">
            {socialLinks
              .filter((link) => link.url.trim())
              .map((link) => (
                <WelcomeSocialCard
                  key={`${link.label}-${link.url}`}
                  label={link.label}
                  url={link.url}
                  accentHex={brand}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
