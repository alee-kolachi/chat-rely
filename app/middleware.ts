import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Temporary auth bypass: allow all dashboard routes without Supabase session checks.
  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
