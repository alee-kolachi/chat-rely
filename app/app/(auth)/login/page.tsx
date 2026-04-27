import type { Metadata } from "next";
import { ChatRelyLoginScreen } from "@/components/auth/chatrely-login-screen";

export const metadata: Metadata = {
  title: "Log in",
};

export default function LoginPage() {
  return <ChatRelyLoginScreen />;
}
