import Link from "next/link";
import { dashboardTabClass } from "@/lib/dashboard-nav-styles";
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
    <nav
      className="border-ds-outline -mx-1 flex min-w-0 items-end gap-4 overflow-x-auto border-b px-1 pb-px md:gap-8"
      aria-label="Agent settings sections"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={cn(dashboardTabClass(tab.key === active), "shrink-0 whitespace-nowrap")}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
