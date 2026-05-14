import { redirect } from "next/navigation";

type SearchParams = Promise<{ agentId?: string | string[] | undefined }>;

/** Legacy URL: installation is handled from Dashboard / Playground after plan selection. */
export default async function InstallationOnboardingRedirectPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const raw = params.agentId;
  const agentId = Array.isArray(raw) ? raw[0] : raw;
  if (typeof agentId === "string" && agentId.trim()) {
    redirect(`/playground?agentId=${encodeURIComponent(agentId.trim())}`);
  }
  redirect("/playground");
}
