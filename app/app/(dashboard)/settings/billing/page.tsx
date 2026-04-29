import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const billingHistory = [
  { date: "Oct 12, 2023", amount: "$299.00", status: "Paid" },
  { date: "Sep 12, 2023", amount: "$299.00", status: "Paid" },
  { date: "Aug 12, 2023", amount: "$299.00", status: "Paid" },
];

const paymentMethods = [
  { brand: "Visa", masked: "•••• 4242", exp: "Exp 12/25", default: true },
  { brand: "MC", masked: "•••• 9812", exp: "Exp 05/24", default: false },
];

export default function SettingsBillingPage() {
  return (
    <div className="ds-app-shell p-6 md:p-8">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <section>
          <h1 className="ds-app-page-title">Billing</h1>
          <p className="ds-app-page-description ds-app-page-description--wide mt-2">
            Business details, payment methods, and invoices. Monthly statements go to the primary email below.
          </p>
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <div className="border-ds-outline overflow-hidden rounded-ds-xl border bg-ds-surface shadow-sm">
              <div className="border-ds-outline bg-ds-sidebar/90 border-b px-6 py-5">
                <h2 className="ds-app-section-title text-base">Billing details</h2>
                <p className="text-ds-on-surface-variant mt-1 text-sm">Legal name and address on invoices</p>
              </div>
              <div className="space-y-4 p-6">
                <LabeledInput label="Business name" value="Acme Global Industries" />
                <LabeledInput label="Address" value="123 Innovation Drive" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <LabeledInput label="City" value="San Francisco" />
                  <LabeledInput label="ZIP / postal code" value="94105" />
                </div>
                <div>
                  <label className="ds-app-kicker mb-2 block text-ds-on-surface-variant">Country</label>
                  <select className="ds-app-field rounded-ds-lg">
                    <option>United States</option>
                    <option>Canada</option>
                    <option>United Kingdom</option>
                    <option>Germany</option>
                  </select>
                </div>
                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary rounded-ds-lg px-6 py-2.5 text-sm font-semibold transition-colors"
                  >
                    Save changes
                  </button>
                </div>
              </div>
            </div>

            <div className="border-ds-outline overflow-hidden rounded-ds-xl border bg-ds-surface shadow-sm">
              <div className="border-ds-outline bg-ds-sidebar/90 flex flex-wrap items-center justify-between gap-3 border-b px-6 py-5">
                <div>
                  <h2 className="ds-app-section-title text-base">Billing history</h2>
                  <p className="text-ds-on-surface-variant mt-1 text-sm">Recent invoices and payments</p>
                </div>
                <button type="button" className="text-ds-primary text-sm font-semibold hover:underline">
                  View all
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="ds-app-kicker bg-ds-sidebar/60 text-ds-on-surface-variant">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Date</th>
                      <th className="px-6 py-3 font-semibold">Amount</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                      <th className="px-6 py-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-ds-outline text-ds-on-surface divide-y text-sm">
                    {billingHistory.map((row) => (
                      <tr key={row.date} className="transition-colors hover:bg-ds-sidebar/40">
                        <td className="px-6 py-4 font-medium">{row.date}</td>
                        <td className="text-ds-on-surface-variant px-6 py-4 tabular-nums">{row.amount}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                            <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                            {row.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            className="text-ds-on-surface-variant hover:text-ds-on-surface rounded-ds-md p-2 transition-colors hover:bg-ds-sidebar"
                            aria-label={`Download invoice ${row.date}`}
                          >
                            <IconDownload className="size-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <SidebarCard title="Billing email">
              <LabeledInput label="Invoice recipient" value="billing@acmeglobal.com" type="email" />
              <button
                type="button"
                className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar mt-4 w-full rounded-ds-lg border bg-white py-2.5 text-sm font-semibold transition-colors"
              >
                Save email
              </button>
            </SidebarCard>

            <SidebarCard title="Tax ID (VAT / GST)">
              <div>
                <label className="ds-app-kicker mb-2 block text-ds-on-surface-variant">Tax registration number</label>
                <input className="ds-app-field rounded-ds-lg" placeholder="e.g. US123456789" />
              </div>
              <button
                type="button"
                className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar mt-4 w-full rounded-ds-lg border bg-white py-2.5 text-sm font-semibold transition-colors"
              >
                Update tax info
              </button>
            </SidebarCard>

            <SidebarCard
              title="Payment methods"
              action={
                <button
                  type="button"
                  className="text-ds-primary inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                >
                  <IconPlus className="size-3.5 shrink-0" aria-hidden />
                  Add
                </button>
              }
            >
              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <div
                    key={method.masked}
                    className={cn(
                      "group flex items-center justify-between rounded-ds-lg border p-4",
                      method.default
                        ? "border-ds-primary/35 bg-ds-primary/6"
                        : "border-ds-outline bg-ds-surface"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-6 w-10 items-center justify-center rounded text-[8px] font-bold uppercase",
                          method.default
                            ? "bg-ds-on-surface text-ds-on-primary"
                            : "border-ds-outline bg-ds-sidebar text-ds-on-surface-variant border"
                        )}
                      >
                        {method.brand}
                      </div>
                      <div>
                        <p className="text-ds-on-surface text-sm font-semibold leading-tight">{method.masked}</p>
                        <p className="text-ds-on-surface-variant text-[11px]">{method.exp}</p>
                      </div>
                    </div>
                    {method.default ? (
                      <span className="bg-ds-primary/15 text-ds-primary rounded px-2 py-0.5 text-[10px] font-semibold uppercase">
                        Default
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="text-rose-600 rounded-ds-md p-1.5 opacity-0 transition-all group-hover:opacity-100 hover:bg-rose-50"
                        aria-label="Remove card"
                      >
                        <IconTrash className="size-4.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="border-ds-outline text-ds-on-surface-variant hover:border-ds-primary/40 hover:text-ds-primary mt-4 flex w-full items-center justify-center gap-2 rounded-ds-lg border-2 border-dashed bg-transparent py-3 text-xs font-semibold transition-colors"
              >
                <IconCard className="size-4.5 shrink-0" aria-hidden />
                Add payment method
              </button>
            </SidebarCard>
          </div>
        </div>
      </div>
    </div>
  );
}

function LabeledInput({ label, value, type = "text" }: { label: string; value: string; type?: string }) {
  return (
    <div>
      <label className="ds-app-kicker mb-2 block text-ds-on-surface-variant">{label}</label>
      <input className="ds-app-field rounded-ds-lg" type={type} defaultValue={value} />
    </div>
  );
}

function SidebarCard({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="border-ds-outline overflow-hidden rounded-ds-xl border bg-ds-surface shadow-sm">
      <div className="border-ds-outline bg-ds-sidebar/90 flex items-center justify-between border-b px-6 py-4">
        <h3 className="text-ds-on-surface text-sm font-semibold">{title}</h3>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function IconBase({
  className,
  children,
  fill = "none",
  strokeWidth = "1.8",
}: {
  className?: string;
  children: ReactNode;
  fill?: string;
  strokeWidth?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

function IconDownload({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 21h16" />
    </IconBase>
  );
}

function IconPlus({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 5v14M5 12h14" />
    </IconBase>
  );
}

function IconTrash({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 7h16M9 7V5h6v2M7 7l1 12h8l1-12" />
    </IconBase>
  );
}

function IconCard({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 15h2" />
    </IconBase>
  );
}
