"use client";

import { ArrowRight } from "lucide-react";
import {
  PoweredByChatRely,
  WIDGET_POWERED_BY_STRIP_CLASS,
} from "@/components/branding/powered-by-chatrely";
import { WidgetBrandAvatar } from "@/components/chat/widget-brand-avatar";
import { brandChromeClasses, parseBrandColorHex } from "@/lib/brand-chrome";
import type { WelcomeScreenSocialLink } from "@/lib/agent-settings";
import {
  detectWelcomeSocialPlatform,
  WelcomeSocialPlatformIcon,
} from "@/lib/welcome-social-platform";
import { defaultAccentPanelBackground } from "@/lib/widget-appearance";
import { cn } from "@/lib/utils";

export type WidgetWelcomeScreenProps = {
  agentName: string;
  brandColorHex?: string | null;
  headline: string;
  description: string;
  buttonLabel: string;
  socialLinks: [WelcomeScreenSocialLink, WelcomeScreenSocialLink];
  websiteLogoUrl?: string | null;
  websiteLogoPending?: boolean;
  hidePoweredBy?: boolean;
  panelBackgroundHex?: string | null;
  className?: string;
  onChatClick?: () => void;
};

function welcomeHeroBackground(accent: string): string {
  return `linear-gradient(165deg, ${accent} 0%, color-mix(in srgb, ${accent} 78%, #000000) 100%)`;
}

function SocialLinkArrow({
  accentHex,
  panelBgHex,
}: {
  accentHex: string;
  panelBgHex: string;
}) {
  return (
    <span
      className="flex size-9 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: accentHex, color: panelBgHex }}
    >
      <ArrowRight className="size-5" strokeWidth={3.25} aria-hidden />
    </span>
  );
}

function isExternalUrl(url: string): boolean {
  const trimmed = url.trim();
  return trimmed.startsWith("http://") || trimmed.startsWith("https://");
}

function WelcomeSocialCard({
  label,
  url,
  accentHex,
  panelBgHex,
}: WelcomeScreenSocialLink & { accentHex: string; panelBgHex: string }) {
  const clickable = isExternalUrl(url);
  const platform = detectWelcomeSocialPlatform(label, url);
  const className = cn(
    "flex items-center gap-3 rounded-[14px] border border-slate-200 bg-white px-3.5 py-3.5 text-sm shadow-[0_8px_24px_rgba(15,23,42,0.1)]",
    clickable && "cursor-pointer"
  );

  const content = (
    <>
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50"
        style={{ color: accentHex }}
      >
        <WelcomeSocialPlatformIcon platform={platform} className="size-5" />
      </span>
      <span className="text-ds-on-surface min-w-0 flex-1 font-medium leading-snug">{label}</span>
      <SocialLinkArrow accentHex={accentHex} panelBgHex={panelBgHex} />
    </>
  );

  if (clickable) {
    return (
      <a
        href={url.trim()}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {content}
      </a>
    );
  }

  return <div className={cn(className, "opacity-90")}>{content}</div>;
}

export function WidgetWelcomeScreen({
  agentName,
  brandColorHex,
  headline,
  description,
  buttonLabel,
  socialLinks,
  websiteLogoUrl,
  websiteLogoPending = false,
  hidePoweredBy = false,
  panelBackgroundHex,
  className,
  onChatClick,
}: WidgetWelcomeScreenProps) {
  const brand = parseBrandColorHex(brandColorHex) ?? "#831C91";
  const panelBg = panelBackgroundHex?.trim() || defaultAccentPanelBackground(brand);
  const chrome = brandChromeClasses(brand);
  const hasBrand = Boolean(parseBrandColorHex(brandColorHex));
  const displayName = agentName.trim() || "Support";

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div
        className="relative shrink-0 overflow-hidden px-5 pb-20 sm:px-6"
        style={{ background: welcomeHeroBackground(brand) }}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.14),transparent_58%)]"
          aria-hidden
        />
        <div className="relative flex min-h-[6.5rem] items-center">
          <h2
            className={cn(
              "text-[1.7rem] font-bold leading-tight tracking-tight sm:text-[1.8rem]",
              chrome.titleClass
            )}
          >
            {headline}
          </h2>
        </div>
      </div>

      <div className="relative z-[1] -mt-[5.5rem] flex min-h-0 flex-1 flex-col">
        <div className="px-4 sm:px-5">
          <div className="rounded-[18px] border border-slate-200 bg-white p-[18px] shadow-[0_12px_36px_rgba(15,23,42,0.12)]">
            <div className="flex items-stretch gap-3.5">
              <WidgetBrandAvatar
                logoUrl={websiteLogoUrl ?? null}
                logoPending={websiteLogoPending}
                hasBrand={hasBrand}
                chrome={chrome}
                brandColorHex={brand}
                size="welcome"
              />
              <div className="min-w-0 flex-1">
                <p className="text-ds-on-surface truncate text-sm font-semibold tracking-tight">{displayName}</p>
                <p className="text-ds-on-surface-variant mt-1.5 text-[13px] leading-relaxed">{description}</p>
              </div>
            </div>
            <button
              type="button"
              className={cn(
                "mt-4 w-full rounded-xl px-4 py-3 text-sm font-bold shadow-[0_6px_18px_rgba(15,23,42,0.14)]",
                chrome.titleClass,
                onChatClick && "cursor-pointer"
              )}
              style={{ backgroundColor: brand }}
              disabled={!onChatClick}
              onClick={onChatClick}
            >
              {buttonLabel}
            </button>
          </div>
        </div>

        <div
          className="mt-4 flex min-h-0 flex-1 flex-col px-4 sm:px-5"
          style={{ backgroundColor: panelBg }}
        >
          <div className="space-y-3.5">
            <WelcomeSocialCard
              label={socialLinks[0].label}
              url={socialLinks[0].url}
              accentHex={brand}
              panelBgHex={panelBg}
            />
            <WelcomeSocialCard
              label={socialLinks[1].label}
              url={socialLinks[1].url}
              accentHex={brand}
              panelBgHex={panelBg}
            />
          </div>

          <div className="flex-1" />

          {!hidePoweredBy ? (
            <PoweredByChatRely compact className={WIDGET_POWERED_BY_STRIP_CLASS} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
