import type { ApiActionCatalogEntry } from "@/components/actions/action-catalog-types";

const ROADMAP_META: Record<string, { category: string }> = {
  "email.bridge": { category: "Email" },
  "zendesk.tickets": { category: "Help desk" },
  "calendly.booking": { category: "Scheduling" },
};

type IntegrationRoadmapCardProps = {
  entry: ApiActionCatalogEntry;
};

export function IntegrationRoadmapCard({ entry }: IntegrationRoadmapCardProps) {
  const category = ROADMAP_META[entry.action_key]?.category ?? "Integration";

  return (
    <div className="border-ds-outline rounded-ds-lg flex items-center justify-between gap-3 border border-dashed bg-ds-sidebar/25 px-4 py-3">
      <div className="min-w-0">
        <p className="text-ds-on-surface-variant text-xs font-semibold">{category}</p>
        <h3 className="ds-app-card-title mt-0.5 truncate">{entry.label}</h3>
      </div>
      <span className="text-ds-on-surface-variant shrink-0 text-xs font-semibold">Soon</span>
    </div>
  );
}
