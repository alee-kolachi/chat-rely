import Link from "next/link";
import { cn } from "@/lib/utils";

type KnowledgeTab = "website" | "files" | "text-snippet" | "q-and-a";

const tabs: { id: KnowledgeTab; label: string; href: string }[] = [
  { id: "website", label: "Website", href: "/knowledge/website" },
  { id: "files", label: "Files", href: "/knowledge/files" },
  { id: "text-snippet", label: "Text snippets", href: "/knowledge/text-snippet" },
  { id: "q-and-a", label: "Q&A", href: "/knowledge/q-and-a" },
];

type KnowledgeMobileSubnavProps = {
  active: KnowledgeTab;
};

export function KnowledgeMobileSubnav({ active }: KnowledgeMobileSubnavProps) {
  return (
    <div className="-mx-4 mb-5 overflow-x-auto px-4 md:hidden">
      <div className="flex min-w-max items-center gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors",
              tab.id === active
                ? "border-ds-primary/45 text-ds-primary bg-white shadow-sm"
                : "border-transparent text-ds-on-surface-variant hover:bg-ds-outline/35 hover:text-ds-on-surface"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
