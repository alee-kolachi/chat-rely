import Link from "next/link";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { ChatRelyWordmark } from "@/components/branding/chat-rely-wordmark";

export default function UpdatePasswordPage() {
  return (
    <div className="bg-ds-surface text-ds-on-surface flex min-h-screen flex-col">
      <header className="z-10 flex w-full shrink-0 items-center justify-between px-6 py-4 md:px-8">
        <ChatRelyWordmark
          href="/"
          className="text-ds-primary gap-2 text-2xl font-bold tracking-tight"
          iconClassName="h-7 w-auto"
          textClassName="text-2xl font-bold text-ds-primary"
        />
      </header>

      <main className="flex flex-1 items-center justify-center p-4 md:p-6">
        <div className="border-ds-outline w-full max-w-md rounded-ds-xl border bg-ds-surface p-10 shadow-md md:p-12">
          <h1 className="mb-2 text-2xl font-bold tracking-tight">Set a new password</h1>
          <p className="text-ds-on-surface-variant mb-8 text-sm">
            Choose a strong password you have not used here before.
          </p>
          <UpdatePasswordForm />
          <p className="text-ds-on-surface-variant mt-8 text-center text-sm">
            <Link href="/login" className="text-ds-primary font-semibold hover:underline">
              Back to log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
