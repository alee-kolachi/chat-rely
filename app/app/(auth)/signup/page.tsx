import type { Metadata } from "next";
import { ChatRelySignupScreen } from "@/components/auth/chatrely-signup-screen";

export const metadata: Metadata = {
  title: "Sign up",
};

export default function SignupPage() {
  return <ChatRelySignupScreen />;
}
