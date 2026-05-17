import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getInternalBackendBaseUrl } from "@/lib/internal-backend-url";
import { resolvePostAuthDestination } from "@/lib/post-auth-destination";
import { resolveSupabaseUrlFromHost } from "@/lib/resolve-supabase-url";

/** Workspace routes that require a finished (or legacy-exempt) onboarding before access. */
function isDashboardAreaPath(pathname: string): boolean {
  const prefixes = [
    "/dashboard",
    "/playground",
    "/analytics",
    "/conversations",
    "/actions",
    "/knowledge",
    "/agent-settings",
    "/account",
    "/tickets",
    "/usage",
    "/deploy",
    "/settings",
    "/notifications",
  ];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const c of from.cookies.getAll()) {
    to.cookies.set(c.name, c.value);
  }
}

export async function proxy(request: NextRequest) {
  if (!isDashboardAreaPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const supabaseUrl = resolveSupabaseUrlFromHost(request.headers.get("host"));
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({
          request: { headers: request.headers },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    const landing = new URL("/", request.url);
    const landingRedirect = NextResponse.redirect(landing);
    copyCookies(supabaseResponse, landingRedirect);
    return landingRedirect;
  }

  let onboardingCompleted = true;
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

  if (!onboardingCompleted) {
    const welcome = new URL(
      resolvePostAuthDestination(`${request.nextUrl.pathname}${request.nextUrl.search}`, false),
      request.url
    );
    const welcomeRedirect = NextResponse.redirect(welcome);
    copyCookies(supabaseResponse, welcomeRedirect);
    return welcomeRedirect;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/(dashboard|playground|analytics|conversations|actions|knowledge|agent-settings|account|tickets|usage|deploy|settings|notifications)(/.*)?",
  ],
};
