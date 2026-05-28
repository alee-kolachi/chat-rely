import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getInternalBackendBaseUrl } from "@/lib/internal-backend-url";
import { resolvePostAuthDestination } from "@/lib/post-auth-destination";
import { resolveSupabaseUrlFromHost } from "@/lib/resolve-supabase-url";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
  }

  const supabaseUrl = resolveSupabaseUrlFromHost(request.headers.get("host"));
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Missing Supabase URL or public API key" }, { status: 500 });
  }

  const redirectResponse = NextResponse.redirect(new URL(safeNext, requestUrl.origin));

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          redirectResponse.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) => {
          redirectResponse.headers.set(key, value);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const login = new URL("/login", requestUrl.origin);
    login.searchParams.set("error", error.message);
    return NextResponse.redirect(login);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    await supabase.auth.signOut();
    const login = new URL("/login", requestUrl.origin);
    login.searchParams.set("error", userError?.message ?? "Sign-in could not be verified.");
    return NextResponse.redirect(login);
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  let onboardingCompleted = true;
  if (session?.access_token) {
    try {
      const gateRes = await fetch(`${getInternalBackendBaseUrl()}/api/v1/me/onboarding-gate`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      if (gateRes.ok) {
        const gate = (await gateRes.json()) as { onboarding_completed?: boolean };
        onboardingCompleted = Boolean(gate.onboarding_completed);
      }
    } catch {
      onboardingCompleted = true;
    }
  }
  const destination = resolvePostAuthDestination(safeNext, onboardingCompleted);
  redirectResponse.headers.set("Location", new URL(destination, requestUrl.origin).toString());

  return redirectResponse;
}
