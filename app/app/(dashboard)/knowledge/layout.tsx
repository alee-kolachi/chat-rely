import type { ReactNode } from "react";
import { KnowledgeDataSourcesProvider } from "@/components/knowledge/knowledge-data-sources-context";

export default function KnowledgeLayout({ children }: { children: ReactNode }) {
  return <KnowledgeDataSourcesProvider>{children}</KnowledgeDataSourcesProvider>;
}
