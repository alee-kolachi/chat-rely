import Link from "next/link";

export function LandingAnnouncementBar() {
  return (
    <Link
      href="/signup"
      className="mkt-font block bg-ds-tertiary px-4 py-2.5 text-center text-[13px] font-medium tracking-tight text-black transition hover:opacity-90"
    >
      See ChatRely answer a live Shopify order question in the playground
    </Link>
  );
}
