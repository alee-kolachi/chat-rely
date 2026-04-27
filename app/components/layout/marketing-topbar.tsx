import Link from "next/link";

export function MarketingTopbar() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-200 px-6 dark:border-zinc-800">
      <Link href="/" className="text-sm font-semibold">
        ChatRely
      </Link>
      <nav className="flex items-center gap-3 text-sm">
        <Link
          href="/login"
          className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-lg bg-zinc-900 px-3 py-1.5 font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Sign up
        </Link>
      </nav>
    </header>
  );
}
