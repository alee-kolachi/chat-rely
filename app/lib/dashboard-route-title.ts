/** Longest-prefix wins; list must be sorted by descending `prefix` length. */
const ROUTE_TITLES: Array<{ prefix: string; title: string }> = [
  { prefix: "/settings/billing", title: "Billing" },
  { prefix: "/settings/plan", title: "Plan" },
  { prefix: "/settings/general", title: "General" },
  { prefix: "/knowledge/website", title: "Website" },
  { prefix: "/knowledge/files", title: "Files" },
  { prefix: "/knowledge/text-snippet", title: "Text snippet" },
  { prefix: "/knowledge/q-and-a", title: "Q&A" },
  { prefix: "/knowledge", title: "Knowledge base" },
  { prefix: "/actions", title: "Actions" },
  { prefix: "/settings", title: "Settings" },
  { prefix: "/dashboard", title: "Dashboard" },
  { prefix: "/analytics", title: "Analytics" },
  { prefix: "/playground", title: "Playground" },
  { prefix: "/conversations", title: "Conversations" },
  { prefix: "/tickets", title: "Tickets" },
  { prefix: "/deploy", title: "Deploy" },
  { prefix: "/usage", title: "Usage" },
];

export function getDashboardScreenTitle(pathname: string): string {
  const path = pathname.split("?")[0] ?? pathname;
  for (const { prefix, title } of ROUTE_TITLES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return title;
  }
  const seg = path.split("/").filter(Boolean)[0];
  if (!seg) return "Dashboard";
  return seg.slice(0, 1).toUpperCase() + seg.slice(1).replace(/-/g, " ");
}
