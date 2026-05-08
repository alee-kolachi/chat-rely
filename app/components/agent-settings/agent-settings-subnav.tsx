import Link from "next/link";
import { cn } from "@/lib/utils";

export type AgentSettingsTabKey = "appearance" | "tone" | "behavior" | "rate-limits";

type AgentSettingsSubnavProps = {
  active: AgentSettingsTabKey;
};

const tabs: Array<{ key: AgentSettingsTabKey; href: string; label: string }> = [
  { key: "appearance", href: "/agent-settings/appearance", label: "Appearance" },
  { key: "tone", href: "/agent-settings/tone", label: "Tone" },
  { key: "behavior", href: "/agent-settings/behavior", label: "Behavior" },
  { key: "rate-limits", href: "/agent-settings/rate-limits", label: "Rate limits" },
];

export function AgentSettingsSubnav({ active }: AgentSettingsSubnavProps) {
  return (
    <div className="border-ds-outline bg-ds-surface/95 border-b backdrop-blur-sm">
      <nav className="mx-auto flex h-14 max-w-5xl items-end gap-6 overflow-x-auto px-6 md:gap-8 md:px-8">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={cn(
              "mb-0 shrink-0 border-b-2 border-transparent px-0.5 pb-3 text-sm transition-colors",
              tab.key === active
                ? "text-ds-primary border-ds-primary font-semibold"
                : "text-ds-on-surface-variant hover:text-ds-on-surface font-medium"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
