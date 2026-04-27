import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
        Support Agent
      </p>
      <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
        AI support that knows your product
      </h1>
      <p className="mt-4 max-w-lg text-lg text-zinc-600 dark:text-zinc-400">
        Train on your knowledge base, automate actions, and resolve tickets
        from one dashboard.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/signup"
          className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Get started
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
