"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignupTypingPreview } from "@/components/auth/signup-typing-preview";
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

function IconClose({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

export function ChatRelySignupScreen() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  async function handleGoogleSignup() {
    setErrorMessage(null);
    setIsGoogleLoading(true);

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/dashboard")}`;
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
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    router.push("/verify-email");
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
        <div className="border-ds-outline flex w-full max-w-6xl overflow-hidden rounded-ds-xl border bg-ds-surface shadow-md lg:h-[min(700px,calc(100vh-9rem))]">
          <div className="mx-auto flex max-w-md flex-1 flex-col justify-center p-10 md:max-w-none md:p-16 lg:max-w-none">
            <div className="mx-auto w-full max-w-[420px]">
              <div className="mb-8">
                <div className="border-ds-outline flex size-12 items-center justify-center rounded-ds-lg border bg-ds-neutral shadow-sm">
                  <IconGrid className="text-ds-primary size-6" />
                </div>
              </div>
              <h1 className="mb-2 text-3xl leading-tight font-bold tracking-tight">
                Turn your Shopify store into a 24/7 support agent
              </h1>
              <p className="text-ds-on-surface-variant mb-8 text-sm">
                Connect your data and launch a custom AI chatbot in minutes.
              </p>

              <button
                type="button"
                onClick={handleGoogleSignup}
                disabled={isGoogleLoading}
                className="border-ds-outline hover:bg-ds-neutral mb-6 flex w-full items-center justify-center gap-3 rounded-ds-md border bg-ds-surface px-4 py-2.5 text-sm font-medium shadow-sm transition-colors"
              >
                <GoogleGlyph className="size-5" />
                {isGoogleLoading ? "Redirecting to Google..." : "Continue with Google"}
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
                  <label htmlFor="signup-name" className="text-ds-on-surface text-xs font-semibold">
                    Full name
                  </label>
                  <input
                    id="signup-name"
                    name="name"
                    type="text"
                    required
                    placeholder="John Doe"
                    autoComplete="name"
                    className="border-ds-outline focus:border-ds-primary placeholder:text-ds-on-surface-variant w-full rounded-ds-md border bg-ds-surface px-4 py-2.5 text-sm transition-all focus:ring-2 focus:ring-black/5"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="signup-email" className="text-ds-on-surface text-xs font-semibold">
                    Work email
                  </label>
                  <input
                    id="signup-email"
                    name="email"
                    type="email"
                    required
                    placeholder="name@company.com"
                    autoComplete="email"
                    className="border-ds-outline focus:border-ds-primary placeholder:text-ds-on-surface-variant w-full rounded-ds-md border bg-ds-surface px-4 py-2.5 text-sm transition-all focus:ring-2 focus:ring-black/5"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="signup-password" className="text-ds-on-surface text-xs font-semibold">
                    Password
                  </label>
                  <input
                    id="signup-password"
                    name="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="border-ds-outline focus:border-ds-primary placeholder:text-ds-on-surface-variant w-full rounded-ds-md border bg-ds-surface px-4 py-2.5 text-sm transition-all focus:ring-2 focus:ring-black/5"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-ds-primary text-ds-on-primary hover:bg-ds-on-surface mt-4 w-full rounded-ds-md py-3 text-sm font-semibold transition-colors"
                >
                  {isSubmitting ? "Creating account..." : "Create account"}
                </button>
                {errorMessage ? (
                  <p className="text-sm text-red-600" role="alert">
                    {errorMessage}
                  </p>
                ) : null}
              </form>

              <p className="text-ds-on-surface-variant mt-8 text-center text-sm">
                Already have an account?{" "}
                <Link href="/login" className="text-ds-primary font-semibold hover:underline">
                  Log in
                </Link>
              </p>
              <p className="text-ds-on-surface-variant mt-8 px-4 text-center text-[10px] leading-relaxed tracking-wider uppercase">
                By signing up you agree to our{" "}
                <Link href="#" className="underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="#" className="underline">
                  Privacy Policy
                </Link>
              </p>
            </div>
          </div>

          <div className="dot-grid border-ds-outline bg-ds-sidebar relative hidden flex-1 items-center justify-center overflow-hidden border-l p-12 lg:flex">
            <div className="border-ds-outline relative z-10 flex h-[480px] w-full max-w-lg scale-110 flex-col overflow-hidden rounded-ds-lg border bg-ds-surface shadow-xl shadow-zinc-300/50">
              <div className="bg-ds-neutral border-ds-outline flex items-center gap-2 border-b px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="size-2.5 rounded-full bg-zinc-200" />
                  <span className="size-2.5 rounded-full bg-zinc-200" />
                  <span className="size-2.5 rounded-full bg-zinc-200" />
                </div>
                <div className="text-ds-on-surface-variant border-ds-outline mx-auto rounded border bg-ds-surface px-12 py-1 text-[10px]">
                  mystore.shopify.com
                </div>
              </div>

              <div className="pointer-events-none select-none space-y-6 p-8 opacity-30">
                <div className="h-8 w-40 rounded bg-zinc-200" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="aspect-square rounded-ds-md bg-zinc-100" />
                  <div className="space-y-3">
                    <div className="h-4 w-full rounded bg-zinc-200" />
                    <div className="h-4 w-3/4 rounded bg-zinc-200" />
                    <div className="mt-4 h-10 w-full rounded bg-zinc-300" />
                  </div>
                </div>
              </div>

              <div className="border-ds-outline absolute bottom-6 right-6 z-10 flex h-[320px] w-72 flex-col overflow-hidden rounded-ds-xl border bg-ds-surface shadow-2xl">
                <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-ds-primary flex size-7 items-center justify-center rounded-full text-ds-on-primary">
                      <IconSmartToy className="size-4" />
                    </div>
                    <div>
                      <div className="text-ds-primary text-[11px] font-bold">ChatRely Assistant</div>
                      <div className="flex items-center gap-1">
                        <span className="size-1 rounded-full bg-green-500" />
                        <span className="text-ds-on-surface-variant text-[9px] font-medium">
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                  <IconClose className="text-ds-on-surface-variant/70" />
                </div>

                <div className="flex flex-grow flex-col space-y-4 bg-ds-surface p-4">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 size-5 shrink-0 rounded-full bg-zinc-100" />
                    <div className="text-ds-on-surface-variant rounded-2xl rounded-tl-none bg-zinc-100 px-3 py-2 text-[11px] leading-normal">
                      Hi there! 👋 How can I help you with your order today?
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="bg-ds-primary flex min-h-[34px] items-center rounded-2xl rounded-br-none px-4 py-2.5 text-[11px] font-medium text-ds-on-primary shadow-sm">
                      <SignupTypingPreview />
                    </div>
                    <span className="text-ds-on-surface-variant mr-1 text-[8px] font-bold tracking-widest uppercase">
                      User typing...
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute bottom-8 text-center">
              <p className="text-ds-on-surface-variant text-[10px] font-bold tracking-[0.2em] opacity-60 uppercase">
                24/7 AI-powered automation
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full shrink-0 border-t border-zinc-200/50 bg-transparent py-4 md:py-5">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-8 md:flex-row">
          <div className="text-ds-on-surface-variant text-[11px] font-bold tracking-widest uppercase">
            © 2026 ChatRely
          </div>
          <div className="flex flex-wrap justify-center gap-6 md:gap-8">
            <Link
              href="#"
              className="text-ds-on-surface-variant hover:text-ds-primary text-[11px] font-bold tracking-widest transition-colors uppercase"
            >
              Privacy Policy
            </Link>
            <Link
              href="#"
              className="text-ds-on-surface-variant hover:text-ds-primary text-[11px] font-bold tracking-widest transition-colors uppercase"
            >
              Terms of Service
            </Link>
            <Link
              href="#"
              className="text-ds-on-surface-variant hover:text-ds-primary text-[11px] font-bold tracking-widest transition-colors uppercase"
            >
              Help Center
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
