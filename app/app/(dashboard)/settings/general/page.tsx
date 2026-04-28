const notificationOptions = [
  {
    title: "Receive email with daily leads",
    description: "Get a summary of all collected lead information once per day.",
    checked: true,
  },
  {
    title: "Receive email with daily conversations",
    description: "A full report of all interactions your chatbot had today.",
    checked: false,
  },
];

export default function SettingsGeneralPage() {
  return (
    <div className="-m-6 min-h-[calc(100vh-3.5rem)] bg-ds-surface p-8">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-10">
          <h1 className="text-ds-primary text-3xl font-extrabold tracking-tight">General Settings</h1>
          <p className="text-ds-on-surface-variant mt-2">
            Manage your account preferences and application configurations.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6">
          <section className="border-ds-outline rounded-ds-xl bg-white p-6 shadow-sm border">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-bold">
              <IconUser className="text-ds-primary size-5" />
              Profile Information
            </h2>
            <div className="flex flex-col items-center gap-6 md:flex-row">
              <div className="group relative shrink-0">
                <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border-2 border-zinc-200 bg-zinc-100">
                  <div className="text-ds-on-surface-variant text-xs font-bold">AH</div>
                  <div className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <IconCamera className="text-white size-5" />
                  </div>
                </div>
                <button className="text-ds-primary mt-2 block w-full text-center text-[10px] font-bold tracking-wider uppercase hover:underline">
                  Change
                </button>
              </div>
              <div className="w-full max-w-sm flex-1">
                <label className="mb-1.5 block text-sm font-bold text-zinc-700">Full name</label>
                <input
                  className="focus:border-ds-primary focus:ring-ds-primary/30 w-full rounded-ds-lg border border-zinc-300 px-4 py-2 text-sm outline-none focus:ring-2"
                  type="text"
                  defaultValue="Alexander Hamilton"
                />
                <p className="mt-2 text-[11px] text-zinc-500">
                  Displayed across profile and notifications.
                </p>
              </div>
            </div>
          </section>

          <section className="border-ds-outline rounded-ds-xl bg-white p-6 shadow-sm border">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-bold">
              <IconMail className="text-ds-primary size-5" />
              Email Settings
            </h2>
            <div className="max-w-sm">
              <label className="mb-1.5 block text-sm font-bold text-zinc-700">Current email</label>
              <div className="flex items-center gap-3">
                <input
                  className="flex-1 cursor-not-allowed rounded-ds-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-500"
                  type="email"
                  readOnly
                  value="alex.hamilton@example.com"
                />
                <button className="text-ds-primary text-sm font-bold hover:underline">Change</button>
              </div>
            </div>
          </section>

          <section className="border-ds-outline rounded-ds-xl bg-white p-6 shadow-sm border">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-bold">
              <IconSpeed className="text-ds-primary size-5" />
              Rate Limit Settings
            </h2>
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-zinc-700">
                <span>Limit to</span>
                <input
                  className="w-16 rounded-ds-lg border border-zinc-300 px-3 py-1.5 text-center font-bold"
                  type="number"
                  defaultValue={20}
                />
                <span>messages every</span>
                <input
                  className="w-16 rounded-ds-lg border border-zinc-300 px-3 py-1.5 text-center font-bold"
                  type="number"
                  defaultValue={60}
                />
                <span>seconds</span>
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-zinc-700">
                  Message to show when limit is hit
                </label>
                <textarea
                  className="focus:border-ds-primary focus:ring-ds-primary/30 w-full rounded-ds-lg border border-zinc-300 px-4 py-3 text-sm outline-none focus:ring-2"
                  rows={3}
                  defaultValue="Too many messages. Please try again in a bit."
                />
              </div>
              <div className="flex justify-end gap-3 border-t border-zinc-100 pt-4">
                <button className="rounded-ds-lg px-5 py-2 text-sm font-bold text-zinc-600 transition-all hover:bg-zinc-100">
                  Reset
                </button>
                <button className="bg-ds-primary text-ds-on-primary rounded-ds-lg px-5 py-2 text-sm font-bold shadow-sm transition-all hover:opacity-90">
                  Save Changes
                </button>
              </div>
            </div>
          </section>

          <section className="border-ds-outline rounded-ds-xl bg-white p-6 shadow-sm border">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-bold">
              <IconBell className="text-ds-primary size-5" />
              Notification Settings
            </h2>
            <div className="space-y-6">
              {notificationOptions.map((option) => (
                <label key={option.title} className="flex cursor-pointer items-start gap-4">
                  <div className="relative flex h-5 items-center">
                    <input
                      type="checkbox"
                      defaultChecked={option.checked}
                      className="h-5 w-5 rounded border-zinc-300 text-black focus:ring-black"
                    />
                  </div>
                  <div className="text-sm">
                    <span className="block font-bold text-zinc-800">{option.title}</span>
                    <span className="text-zinc-500">{option.description}</span>
                  </div>
                </label>
              ))}
              <div className="flex justify-end pt-4">
                <button className="bg-ds-primary text-ds-on-primary rounded-ds-lg px-6 py-2 text-sm font-bold shadow-sm transition-all hover:opacity-90">
                  Save Preferences
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-ds-xl border border-red-200 bg-red-50 p-6">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-red-700">
              <IconWarning className="size-5" />
              Danger Zone
            </h2>
            <p className="mb-6 text-[13px] text-red-600">
              Irreversible actions that will permanently affect your data and account.
            </p>
            <div className="space-y-4">
              <DangerItem
                title="Clear Data"
                description="Permanently remove all chat logs and history from the system."
                action="Delete all conversations"
                subtle
                icon={<IconDeleteSweep className="size-4.5" />}
              />
              <DangerItem
                title="Close Account"
                description="Deactivate your profile and remove all associated personal information."
                action="Delete account"
                icon={<IconDeleteForever className="size-4.5" />}
              />
            </div>
          </section>
        </div>

        <footer className="text-ds-on-surface-variant mt-12 pb-12 text-center text-[10px] tracking-widest uppercase">
          © 2024 Settings Console. Built with Inter.
        </footer>
      </div>
    </div>
  );
}

function DangerItem({
  title,
  description,
  action,
  icon,
  subtle = false,
}: {
  title: string;
  description: string;
  action: string;
  icon: React.ReactNode;
  subtle?: boolean;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-ds-lg border border-red-100 bg-white p-4 sm:flex-row sm:items-center">
      <div>
        <h3 className="text-sm font-bold text-zinc-900">{title}</h3>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      <button
        className={`flex items-center justify-center gap-2 rounded-ds-lg px-5 py-2.5 text-sm font-bold whitespace-nowrap transition-all ${
          subtle
            ? "border border-red-200 bg-white text-red-600 hover:bg-red-50"
            : "bg-red-600 text-white shadow-sm hover:bg-red-700"
        }`}
      >
        {icon}
        {action}
      </button>
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

function IconUser({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </IconBase>
  );
}

function IconCamera({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 8h4l2-2h4l2 2h4v10H4z" />
      <circle cx="12" cy="13" r="3" />
    </IconBase>
  );
}

function IconMail({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </IconBase>
  );
}

function IconSpeed({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 14a8 8 0 1 1 16 0" />
      <path d="m12 12 4-4" />
      <path d="M12 20v-2" />
    </IconBase>
  );
}

function IconBell({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M6 10a6 6 0 0 1 12 0v5l1.5 2h-15L6 15v-5Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </IconBase>
  );
}

function IconWarning({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 3 2.8 19h18.4L12 3Z" />
      <path d="M12 9v4M12 16h.01" />
    </IconBase>
  );
}

function IconDeleteSweep({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 7h16M9 7V5h6v2M7 7l1 12h8l1-12" />
      <path d="m16.5 9.5 2 2 2.5-2.5" />
    </IconBase>
  );
}

function IconDeleteForever({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 7h16M9 7V5h6v2M7 7l1 12h8l1-12" />
      <path d="m10 11 4 4M14 11l-4 4" />
    </IconBase>
  );
}
