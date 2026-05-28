type AdminApiErrorPanelProps = {
  title?: string;
  message: string;
};

export function AdminApiErrorPanel({
  title = "Could not load admin data",
  message,
}: AdminApiErrorPanelProps) {
  return (
    <div className="flex flex-col gap-3 p-6">
      <h1 className="text-ds-on-surface text-2xl font-semibold">{title}</h1>
      <p className="text-ds-on-surface-variant text-sm">{message}</p>
      <p className="ds-app-body-muted text-sm">
        Check that the FastAPI backend is running and reachable from this app, then refresh.
      </p>
    </div>
  );
}
