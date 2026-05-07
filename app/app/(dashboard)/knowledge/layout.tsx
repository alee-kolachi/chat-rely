import type { ReactNode } from "react";
import { Suspense } from "react";
import { KnowledgeDataSourcesProvider } from "@/components/knowledge/knowledge-data-sources-context";

export default function KnowledgeLayout({ children }: { children: ReactNode }) {
  return (
    <KnowledgeDataSourcesProvider>
      <Suspense fallback={null}>{children}</Suspense>
    </KnowledgeDataSourcesProvider>
  );
}
