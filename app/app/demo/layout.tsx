import type { ReactNode } from "react";

export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900 antialiased">
      {children}
    </div>
  );
}

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};
