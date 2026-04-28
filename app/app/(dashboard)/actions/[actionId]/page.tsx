import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionDetailTabs } from "@/components/actions/action-detail-tabs";
import { ActionToggle } from "@/components/actions/action-toggle";
import { IconAction, IconArrowLeft, IconWarning } from "@/components/actions/action-icons";
import { StatusBadge } from "@/components/actions/status-badge";
import {
  getShopifyAction,
  listShopifyActionIds,
} from "@/components/actions/shopify-actions-data";

type PageProps = {
  params: Promise<{ actionId: string }>;
};

export function generateStaticParams() {
  return listShopifyActionIds().map((actionId) => ({ actionId }));
}

export default async function ActionDetailPage({ params }: PageProps) {
  const { actionId } = await params;
  const action = getShopifyAction(actionId);
  if (!action) notFound();

  const isComingSoon = action.status === "coming-soon";

  return (
    <div className="-m-6 min-h-[calc(100vh-3.5rem)] bg-ds-surface p-8">
      <div className="mx-auto w-full max-w-4xl pb-32">
        <nav className="text-ds-on-surface-variant mb-6 flex items-center gap-2 text-xs">
          <Link
            href="/actions"
            className="hover:text-ds-on-surface inline-flex items-center gap-1 transition-colors"
          >
            <IconArrowLeft className="size-3.5" />
            Actions
          </Link>
          <span className="text-zinc-300">/</span>
          <span className="text-ds-on-surface font-medium">{action.label}</span>
        </nav>

        <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="border-ds-outline bg-ds-sidebar text-ds-on-surface flex size-12 shrink-0 items-center justify-center rounded-ds-md border">
              <IconAction iconKey={action.icon} className="size-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-ds-primary text-2xl font-extrabold tracking-tight">
                  {action.label}
                </h1>
                <StatusBadge status={action.status} />
              </div>
              <p className="text-ds-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
                {action.description}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-ds-on-surface-variant text-[10px] font-bold tracking-widest uppercase">
              Enable
            </span>
            <ActionToggle
              defaultChecked={action.enabled}
              disabled={isComingSoon}
              size="md"
              label={`Enable ${action.label}`}
            />
          </div>
        </header>

        {isComingSoon && (
          <div className="rounded-ds-md mb-6 flex items-start gap-3 border border-amber-200 bg-amber-50 p-4">
            <IconWarning className="mt-0.5 size-4 text-amber-700" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold">This action isn&apos;t available yet.</p>
              <p className="mt-1 text-amber-800">
                We&apos;re still finalizing the integration. You can review the configuration
                here, but enabling and test runs are disabled until launch.
              </p>
            </div>
          </div>
        )}

        <ActionDetailTabs action={action} />
      </div>

      <div className="border-ds-outline fixed right-0 bottom-0 left-0 z-10 border-t bg-white/90 backdrop-blur md:left-64">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-8 py-3">
          <span className="text-ds-on-surface-variant text-xs">
            Changes apply once saved.
          </span>
          <div className="flex items-center gap-2">
            <Link
              href="/actions"
              className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar rounded-ds-md border bg-white px-4 py-2 text-sm font-semibold transition-colors"
            >
              Cancel
            </Link>
            <button
              type="button"
              disabled={isComingSoon}
              className="bg-ds-primary text-ds-on-primary rounded-ds-md px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
