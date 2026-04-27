import type { ReactNode } from "react";
import { MarketingTopbar } from "@/components/layout/marketing-topbar";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <MarketingTopbar />
      {children}
    </div>
  );
}
