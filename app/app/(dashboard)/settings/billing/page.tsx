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
    <div className="-m-6 min-h-[calc(100vh-3.5rem)] bg-ds-surface p-8">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <section>
          <h1 className="text-3xl font-extrabold tracking-tight text-black">Billing Settings</h1>
          <p className="mt-2 max-w-2xl text-zinc-500">
            Manage your organizational billing details, payment methods, and tax documentation.
            Your monthly invoice will be sent to the primary email listed below.
          </p>
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-100 bg-zinc-50/50 p-6">
                <h3 className="text-lg font-bold">Billing Details</h3>
                <p className="text-sm text-zinc-500">Business identity and legal address</p>
              </div>
              <div className="space-y-4 p-6">
                <LabeledInput label="Business Name" value="Acme Global Industries" />
                <LabeledInput label="Address" value="123 Innovation Drive" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <LabeledInput label="City" value="San Francisco" />
                  <LabeledInput label="Zip / Postal Code" value="94105" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold tracking-wider text-zinc-500 uppercase">
                    Country
                  </label>
                  <select className="w-full rounded border border-zinc-200 px-4 py-2 text-sm transition-all focus:border-orange-500 focus:ring-1 focus:ring-orange-500">
                    <option>United States</option>
                    <option>Canada</option>
                    <option>United Kingdom</option>
                    <option>Germany</option>
                  </select>
                </div>
                <div className="flex justify-end pt-4">
                  <button className="rounded bg-black px-6 py-2 text-sm font-bold text-white transition-opacity hover:opacity-80">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/50 p-6">
                <div>
                  <h3 className="text-lg font-bold">Billing History</h3>
                  <p className="text-sm text-zinc-500">Your recent invoices and payments</p>
                </div>
                <button className="text-sm font-semibold text-orange-500 hover:underline">View All</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50/50 text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                    <tr>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm">
                    {billingHistory.map((row) => (
                      <tr key={row.date} className="transition-colors hover:bg-zinc-50">
                        <td className="px-6 py-4 font-medium text-black">{row.date}</td>
                        <td className="px-6 py-4 text-zinc-600">{row.amount}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {row.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="rounded p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-black">
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
            <SidebarCard title="Billing Email">
              <LabeledInput label="Invoice Recipient" value="billing@acmeglobal.com" type="email" />
              <button className="mt-4 w-full rounded bg-zinc-100 py-2 text-sm font-bold text-black transition-colors hover:bg-zinc-200">
                Save Email
              </button>
            </SidebarCard>

            <SidebarCard title="Tax ID (VAT/GST)">
              <div>
                <label className="mb-1 block text-xs font-bold tracking-wider text-zinc-500 uppercase">
                  Tax Registration Number
                </label>
                <input
                  className="w-full rounded border border-zinc-200 px-4 py-2 text-sm transition-all focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  placeholder="e.g. US123456789"
                />
              </div>
              <button className="mt-4 w-full rounded bg-zinc-100 py-2 text-sm font-bold text-black transition-colors hover:bg-zinc-200">
                Update Tax Info
              </button>
            </SidebarCard>

            <SidebarCard
              title="Payment Methods"
              action={
                <button className="flex items-center gap-1 text-xs font-bold text-orange-500 hover:underline">
                  <IconPlus className="size-3.5" />
                  Add
                </button>
              }
            >
              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <div
                    key={method.masked}
                    className={`group flex items-center justify-between rounded-lg border p-4 ${
                      method.default
                        ? "border-orange-200 bg-orange-50/30"
                        : "border-zinc-100 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-6 w-10 items-center justify-center rounded text-[8px] font-bold uppercase italic ${
                          method.default
                            ? "bg-zinc-800 text-white"
                            : "border border-zinc-200 bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {method.brand}
                      </div>
                      <div>
                        <p className="text-sm leading-tight font-bold">{method.masked}</p>
                        <p className="text-[10px] text-zinc-500">{method.exp}</p>
                      </div>
                    </div>
                    {method.default ? (
                      <span className="rounded bg-orange-100 px-2 py-0.5 text-[10px] font-black text-orange-600 uppercase">
                        Default
                      </span>
                    ) : (
                      <button className="rounded p-1.5 text-red-600 opacity-0 transition-all group-hover:opacity-100 hover:bg-zinc-100">
                        <IconTrash className="size-4.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-200 py-3 text-xs font-semibold text-zinc-400 transition-all hover:border-orange-200 hover:bg-orange-50/20 hover:text-orange-500">
                <IconCard className="size-4.5" />
                Add new payment method
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
      <label className="mb-1 block text-xs font-bold tracking-wider text-zinc-500 uppercase">{label}</label>
      <input
        className="w-full rounded border border-zinc-200 px-4 py-2 text-sm transition-all focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
        type={type}
        defaultValue={value}
      />
    </div>
  );
}

function SidebarCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/50 p-6">
        <h3 className="text-sm font-bold">{title}</h3>
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
  children: React.ReactNode;
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
