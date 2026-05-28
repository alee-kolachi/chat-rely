import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { createServerSupabaseClient, getValidatedServerAuth } from "@/lib/supabase-server";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const auth = await getValidatedServerAuth();
  if (!auth) notFound();

  const base = (
    process.env.BACKEND_INTERNAL_URL ||
    process.env.API_PROXY_TARGET ||
    "http://127.0.0.1:8000"
  )
    .trim()
    .replace(/\/$/, "");
  let res: Response;
  try {
    res = await fetch(`${base}/api/v1/admin/me`, {
      headers: { Authorization: `Bearer ${auth.session.access_token}` },
      cache: "no-store",
    });
  } catch {
    // Backend not reachable (DNS/connection) should not crash the admin route render.
    notFound();
  }
  if (!res.ok) notFound();

  const me = (await res.json()) as { email?: string | null; is_admin: boolean };
  const email = typeof me.email === "string" ? me.email : "";
  if (!email) notFound();

  return <AdminShell email={email}>{children}</AdminShell>;
}
