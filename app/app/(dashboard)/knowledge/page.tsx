import { PageHeader } from "@/components/dashboard/page-header";
import { KnowledgeWorkspaceShell } from "@/components/knowledge/knowledge-workspace-shell";

export default function KnowledgePage() {
  return (
    <KnowledgeWorkspaceShell>
      <main className="min-w-0 flex-1 p-6 md:p-8">
        <PageHeader
          title="Knowledge"
          description="Documents and data sources your agent retrieves from when answering customers."
          descriptionWide
        />
      </main>
    </KnowledgeWorkspaceShell>
  );
}
