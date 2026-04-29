import { PageHeader } from "@/components/dashboard/page-header";

export default function SettingsPage() {
  return (
    <div className="ds-app-shell p-6 md:p-8">
      <div className="mx-auto w-full max-w-5xl">
        <PageHeader
          title="Settings"
          description="Workspace, team, billing, and integration preferences."
          descriptionWide
        />
      </div>
    </div>
  );
}
