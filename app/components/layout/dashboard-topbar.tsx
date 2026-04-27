import { LogoutButton } from "@/components/auth/logout-button";

export function DashboardTopbar() {
  return (
    <header className="border-ds-outline flex h-14 items-center justify-between border-b px-4 md:hidden">
      <span className="text-ds-on-surface text-sm font-semibold">ChatRely</span>
      <LogoutButton className="text-ds-on-surface-variant hover:bg-ds-neutral rounded-ds-md px-3 py-1.5 text-sm transition-colors hover:text-ds-on-surface" />
    </header>
  );
}
