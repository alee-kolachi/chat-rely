import type { Metadata } from "next";
import { ChatRelySignupScreen } from "@/components/auth/chatrely-signup-screen";
import { redirectAuthenticatedUser } from "@/lib/redirect-authenticated-user";

export const metadata: Metadata = {
  title: "Sign up",
};

type SignupPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const rawNext = params.next;
  const nextPath = typeof rawNext === "string" ? rawNext : undefined;
  await redirectAuthenticatedUser(nextPath);

  return <ChatRelySignupScreen />;
}
