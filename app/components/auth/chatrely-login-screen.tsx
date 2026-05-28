"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LoginTypingPreview } from "@/components/auth/login-typing-preview";
import { CHAT_RELY_LOGO_PATH, ChatRelyWordmark } from "@/components/branding/chat-rely-wordmark";
import { MarketingAuthHeader } from "@/components/marketing/marketing-auth-header";
import { MarketingSiteFooter } from "@/components/marketing/marketing-site-footer";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { loginWithEmailPassword } from "@/app/(auth)/login/actions";

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
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [formState, formAction, isAuthPending] = useActionState(loginWithEmailPassword, undefined);

  const nextParam = searchParams.get("next");
  const nextHiddenValue =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "";
  const oauthCallbackError = searchParams.get("error");
  const googleOrOAuthError = errorMessage ?? oauthCallbackError;

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

  return (
    <div className="bg-ds-surface text-ds-on-surface flex min-h-screen flex-col">
      <MarketingAuthHeader />

      <main className="flex flex-1 items-center justify-center p-4 md:p-6">
        <div className="border-ds-outline flex h-auto w-full max-w-6xl overflow-hidden rounded-ds-xl border bg-ds-surface shadow-md lg:min-h-[680px]">
          <div className="mx-auto flex max-w-md flex-1 flex-col justify-center p-10 md:max-w-none md:p-16 lg:max-w-none">
            <div className="mx-auto w-full max-w-[400px]">
              <div className="mb-8">
                <ChatRelyWordmark
                  iconClassName="h-8 w-auto"
                  textClassName="text-3xl font-bold text-ds-primary"
                />
              </div>
              <h1 className="mb-2 text-3xl font-bold tracking-tight">Welcome back</h1>
              <p className="text-ds-on-surface-variant mb-8">
                Log in to access your ChatRely workspace.
              </p>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className={`border-ds-outline hover:bg-ds-neutral flex w-full items-center justify-center gap-3 rounded-ds-md border bg-ds-surface px-4 py-2.5 text-sm font-medium shadow-sm transition-colors ${googleOrOAuthError ? "mb-2" : "mb-6"}`}
              >
                <GoogleGlyph className="size-5" />
                {isGoogleLoading ? "Redirecting to Google..." : "Sign in with Google"}
              </button>
              {googleOrOAuthError ? (
                <p className="text-sm text-red-600 mb-4" role="alert">
                  {googleOrOAuthError}
                </p>
              ) : null}

              <div className="text-ds-on-surface-variant relative mb-6 flex items-center">
                <div className="border-ds-outline flex-grow border-t" />
                <span className="ds-app-kicker mx-4 shrink font-bold">
                  Or continue with email
                </span>
                <div className="border-ds-outline flex-grow border-t" />
              </div>

              <form className="space-y-4" action={formAction}>
                <input type="hidden" name="next" value={nextHiddenValue} />
                <div className="space-y-1.5">
                  <label htmlFor="login-email" className="ds-app-label">
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
                    <label htmlFor="login-password" className="ds-app-label">
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-ds-primary text-sm font-medium hover:underline"
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
                    value="on"
                    className="border-ds-outline text-ds-primary focus:ring-black/5 size-4 cursor-pointer rounded border transition-all"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ds-app-body-muted cursor-pointer select-none font-medium"
                  >
                    Remember me
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={isAuthPending}
                  className="bg-ds-primary text-ds-on-primary hover:bg-ds-primary-hover mt-2 w-full rounded-ds-md py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAuthPending ? "Logging in..." : "Log in"}
                </button>
                {formState?.error ? (
                  <p className="text-sm text-red-600" role="alert">
                    {formState.error}
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

          <div className="dot-grid border-ds-outline hidden flex-1 items-center justify-center border-l p-12 lg:flex">
            <div className="w-full max-w-sm">
              <div className="border-ds-outline flex h-[400px] flex-col overflow-hidden rounded-ds-xl border bg-ds-surface shadow-xl shadow-zinc-200/50">
                <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="border-ds-outline flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG from /public */}
                      <img src={CHAT_RELY_LOGO_PATH} alt="" className="h-5 w-auto object-contain" />
                    </div>
                    <div>
                      <div className="ds-app-card-title text-ds-primary">ChatRely Assistant</div>
                      <div className="flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-green-500" />
                        <span className="ds-app-caption">
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
                    <div className="ds-app-body-muted rounded-2xl rounded-bl-none bg-zinc-100 px-4 py-2.5">
                      Hello! How can I help you with your account today?
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="bg-ds-primary text-ds-on-primary flex min-h-[48px] max-w-[90%] items-center rounded-2xl rounded-br-none px-5 py-3.5 text-sm font-medium shadow-md">
                      <LoginTypingPreview />
                    </div>
                    <span className="ds-app-kicker mr-1 font-bold">
                      User typing…
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-8 text-center">
                <p className="ds-app-kicker font-bold opacity-80">
                  Automate your customer experience
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <MarketingSiteFooter variant="auth" />
    </div>
  );
}
