import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatRelyLoginScreen } from "@/components/auth/chatrely-login-screen";
import { redirectAuthenticatedUser } from "@/lib/redirect-authenticated-user";

export const metadata: Metadata = {
  title: "Log in",
};

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const rawNext = params.next;
  const nextPath = typeof rawNext === "string" ? rawNext : undefined;
  await redirectAuthenticatedUser(nextPath);

  return (
    <Suspense fallback={<div className="p-8 text-sm text-zinc-500">Loading…</div>}>
      <ChatRelyLoginScreen />
    </Suspense>
  );
}
