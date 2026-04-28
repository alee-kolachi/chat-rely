"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginTypingPreview } from "@/components/auth/login-typing-preview";
import { createBrowserSupabaseClient } from "@/lib/supabase";

function IconGrid({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconSmartToy({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1v2h-1v1a2 2 0 01-2 2H4a2 2 0 01-2-2v-1H1v-2h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zM7.5 13a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm9 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"
        fill="currentColor"
      />
    </svg>
  );
}

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function ChatRelyLoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  async function handleGoogleSignIn() {
    setErrorMessage(null);
    setIsGoogleLoading(true);

    const nextParam = searchParams.get("next");
    const nextPath =
      nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
        ? nextParam
        : "/dashboard";
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setIsGoogleLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      setErrorMessage(
        sessionError?.message ??
          "Login succeeded but no auth session was persisted. Check Supabase URL/key env values."
      );
      setIsSubmitting(false);
      return;
    }

    const nextParam = searchParams.get("next");
    const destination =
      nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
        ? nextParam
        : "/dashboard";

    router.push(destination);
    router.refresh();
  }

  return (
    <div className="bg-ds-sidebar text-ds-on-surface flex min-h-screen flex-col">
      <header className="z-10 flex w-full shrink-0 items-center justify-between px-6 py-4 md:px-8">
        <Link
          href="/"
          className="text-ds-primary flex items-center gap-2 text-xl font-bold tracking-tight"
        >
          <span className="inline-flex size-9 items-center justify-center rounded-ds-md border border-ds-outline bg-ds-surface shadow-sm">
            <IconGrid className="size-5" />
          </span>
          ChatRely
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/"
            className="text-ds-on-surface-variant hover:text-ds-primary text-sm font-medium transition-colors"
          >
            Platform
          </Link>
          <Link
            href="/"
            className="text-ds-on-surface-variant hover:text-ds-primary text-sm font-medium transition-colors"
          >
            Showcase
          </Link>
          <Link
            href="/"
            className="text-ds-on-surface-variant hover:text-ds-primary text-sm font-medium transition-colors"
          >
            Back to Website
          </Link>
        </nav>
      </header>

      <main className="flex flex-1 items-center justify-center p-4 md:p-6">
        <div className="border-ds-outline flex w-full max-w-6xl overflow-hidden rounded-ds-xl border bg-ds-surface shadow-md lg:h-[min(680px,calc(100vh-9rem))]">
          <div className="mx-auto flex max-w-md flex-1 flex-col justify-center p-10 md:max-w-none md:p-16 lg:max-w-none">
            <div className="mx-auto w-full max-w-[400px]">
              <div className="mb-8">
                <div className="border-ds-outline flex size-12 items-center justify-center rounded-ds-lg border bg-ds-neutral shadow-sm">
                  <IconGrid className="text-ds-primary size-6" />
                </div>
              </div>
              <h1 className="mb-2 text-3xl font-bold tracking-tight">Welcome back</h1>
              <p className="text-ds-on-surface-variant mb-8">
                Log in to access your ChatRely workspace.
              </p>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="border-ds-outline hover:bg-ds-neutral mb-6 flex w-full items-center justify-center gap-3 rounded-ds-md border bg-ds-surface px-4 py-2.5 text-sm font-medium shadow-sm transition-colors"
              >
                <GoogleGlyph className="size-5" />
                {isGoogleLoading ? "Redirecting to Google..." : "Sign in with Google"}
              </button>

              <div className="text-ds-on-surface-variant relative mb-6 flex items-center">
                <div className="border-ds-outline flex-grow border-t" />
                <span className="mx-4 shrink text-[10px] font-bold uppercase tracking-widest">
                  Or continue with email
                </span>
                <div className="border-ds-outline flex-grow border-t" />
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-1.5">
                  <label htmlFor="login-email" className="text-ds-on-surface text-xs font-semibold">
                    Email address
                  </label>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="name@company.com"
                    className="border-ds-outline focus:border-ds-primary placeholder:text-ds-on-surface-variant w-full rounded-ds-md border bg-ds-surface px-4 py-2.5 text-sm transition-all focus:ring-2 focus:ring-black/5"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="login-password" className="text-ds-on-surface text-xs font-semibold">
                      Password
                    </label>
                    <Link
                      href="#"
                      className="text-ds-primary text-xs font-medium hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="border-ds-outline focus:border-ds-primary placeholder:text-ds-on-surface-variant w-full rounded-ds-md border bg-ds-surface px-4 py-2.5 text-sm transition-all focus:ring-2 focus:ring-black/5"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="remember-me"
                    name="remember"
                    type="checkbox"
                    className="border-ds-outline text-ds-primary focus:ring-black/5 size-4 cursor-pointer rounded border transition-all"
                  />
                  <label
                    htmlFor="remember-me"
                    className="text-ds-on-surface-variant cursor-pointer select-none text-xs font-medium"
                  >
                    Remember me
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-ds-primary text-ds-on-primary hover:bg-ds-on-surface mt-2 w-full rounded-ds-md py-3 text-sm font-semibold transition-colors"
                >
                  {isSubmitting ? "Logging in..." : "Log in"}
                </button>
                {errorMessage ? (
                  <p className="text-sm text-red-600" role="alert">
                    {errorMessage}
                  </p>
                ) : null}
              </form>

              <p className="text-ds-on-surface-variant mt-8 text-center text-sm">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="text-ds-primary font-semibold hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          </div>

          <div className="dot-grid border-ds-outline bg-ds-sidebar hidden flex-1 items-center justify-center border-l p-12 lg:flex">
            <div className="w-full max-w-sm">
              <div className="border-ds-outline flex h-[400px] flex-col overflow-hidden rounded-ds-xl border bg-ds-surface shadow-xl shadow-zinc-200/50">
                <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-ds-primary flex size-9 items-center justify-center rounded-full text-ds-on-primary">
                      <IconSmartToy className="size-5" />
                    </div>
                    <div>
                      <div className="text-ds-primary text-[13px] font-bold">ChatRely Assistant</div>
                      <div className="flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-green-500" />
                        <span className="text-ds-on-surface-variant text-[10px] font-medium">
                          Always active
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="size-1.5 rounded-full bg-zinc-200" />
                    <span className="size-1.5 rounded-full bg-zinc-200" />
                  </div>
                </div>
                <div className="flex flex-grow flex-col justify-end space-y-5 p-6">
                  <div className="flex max-w-[85%] items-end gap-2.5">
                    <div className="size-6 shrink-0 rounded-full bg-zinc-100" />
                    <div className="text-ds-on-surface-variant rounded-2xl rounded-bl-none bg-zinc-100 px-4 py-2.5 text-xs leading-relaxed">
                      Hello! How can I help you with your account today?
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="bg-ds-primary text-ds-on-primary flex min-h-[48px] max-w-[90%] items-center rounded-2xl rounded-br-none px-5 py-3.5 text-[13px] font-medium shadow-md">
                      <LoginTypingPreview />
                    </div>
                    <span className="text-ds-on-surface-variant mr-1 text-[10px] font-bold uppercase tracking-widest">
                      User typing…
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-8 text-center">
                <p className="text-ds-on-surface-variant text-[11px] font-bold uppercase tracking-[0.25em] opacity-80">
                  Automate your customer experience
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full shrink-0 border-t border-zinc-200/50 bg-transparent py-4 md:py-5">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-8 md:flex-row">
          <div className="text-ds-on-surface-variant text-[11px] font-bold uppercase tracking-widest">
            © 2026 ChatRely
          </div>
          <div className="flex flex-wrap justify-center gap-6 md:gap-8">
            <Link
              href="#"
              className="text-ds-on-surface-variant hover:text-ds-primary text-[11px] font-bold uppercase tracking-widest transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="#"
              className="text-ds-on-surface-variant hover:text-ds-primary text-[11px] font-bold uppercase tracking-widest transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="#"
              className="text-ds-on-surface-variant hover:text-ds-primary text-[11px] font-bold uppercase tracking-widest transition-colors"
            >
              Help Center
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
