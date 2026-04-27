import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ds-neutral px-6">
      <div className="border-ds-outline w-full max-w-md rounded-ds-xl border bg-ds-surface p-8 shadow-md">
        <h1 className="text-ds-on-surface text-2xl font-bold tracking-tight">Check your email</h1>
        <p className="text-ds-on-surface-variant mt-3 text-sm leading-relaxed">
          We sent you a verification link. Open it to confirm your account and finish setup.
        </p>
        <div className="mt-6">
          <Link
            href="/login"
            className="bg-ds-primary text-ds-on-primary inline-flex w-full justify-center rounded-ds-md px-4 py-2.5 text-sm font-semibold"
          >
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}
