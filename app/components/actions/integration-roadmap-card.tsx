import type { ApiActionCatalogEntry } from "@/components/actions/action-catalog-types";

const ROADMAP_META: Record<string, { category: string }> = {
  "email.bridge": { category: "Messaging" },
  "zendesk.tickets": { category: "Help desk" },
  "calendly.booking": { category: "Scheduling" },
};

type IntegrationRoadmapCardProps = {
  entry: ApiActionCatalogEntry;
};

export function IntegrationRoadmapCard({ entry }: IntegrationRoadmapCardProps) {
  const category = ROADMAP_META[entry.action_key]?.category ?? "Integration";

  return (
    <div className="border-ds-outline rounded-ds-xl flex flex-col border border-dashed bg-ds-surface/60 p-5">
      <p className="ds-app-kicker font-bold">{category}</p>
      <h3 className="ds-app-card-title mt-1">{entry.label}</h3>
      <p className="ds-app-body-muted mt-2 flex-1">{entry.description}</p>
      <p className="ds-app-kicker mt-4 font-semibold">
        Coming soon
      </p>
    </div>
  );
}
