import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatRelyLoginScreen } from "@/components/auth/chatrely-login-screen";

export const metadata: Metadata = {
  title: "Log in",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-zinc-500">Loading…</div>}>
      <ChatRelyLoginScreen />
    </Suspense>
  );
}
