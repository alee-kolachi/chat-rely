import type { ReactNode } from "react";
import { MarketingTopbar } from "@/components/layout/marketing-topbar";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mkt-font flex min-h-full flex-1 flex-col bg-ds-surface text-base text-ds-on-surface">
      <MarketingTopbar />
      {children}
    </div>
  );
}
