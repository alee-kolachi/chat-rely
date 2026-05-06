import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveSupabaseUrlFromHost } from "@/lib/resolve-supabase-url";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  const redirectSuccess = new URL(safeNext, requestUrl.origin);
  const response = NextResponse.redirect(redirectSuccess);

  if (!code) {
    return response;
  }

  const supabaseUrl = resolveSupabaseUrlFromHost(request.headers.get("host"));
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Missing Supabase URL or public API key" }, { status: 500 });
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
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

  return response;
}
