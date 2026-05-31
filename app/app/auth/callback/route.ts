import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { fetchOnboardingGateServer } from "@/lib/server-bootstrap-me";
import { resolvePostAuthDestination } from "@/lib/post-auth-destination";
import { resolveSupabaseUrlFromHost } from "@/lib/resolve-supabase-url";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (!code) {
    const login = new URL("/login", requestUrl.origin);
    login.searchParams.set("error", "Sign-in link was invalid or expired. Try again.");
    return NextResponse.redirect(login);
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
  const gate =
    session?.access_token != null
      ? await fetchOnboardingGateServer(session.access_token)
      : { onboarding_completed: true, is_admin: false };
  const destination = resolvePostAuthDestination(safeNext, gate);
  redirectResponse.headers.set("Location", new URL(destination, requestUrl.origin).toString());

  return redirectResponse;
}
