import type { Metadata } from "next";
import { DemoStorePageClient } from "@/app/demo/[slug]/demo-store-page-client";
import { fetchDemoPublicConfig, ServerBackendApiError } from "@/lib/server-backend-fetch";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const config = await fetchDemoPublicConfig(slug);
    return { title: `${config.display_name} demo` };
  } catch {
    return { title: "Demo" };
  }
}

export default async function DemoStorePage({ params }: PageProps) {
  const { slug } = await params;

  try {
    const config = await fetchDemoPublicConfig(slug);
    return <DemoStorePageClient slug={slug} initialConfig={config} />;
  } catch (e) {
    const message = e instanceof ServerBackendApiError ? e.message : "Demo not found";
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center sm:max-w-3xl">
        <p className="text-lg text-neutral-700">{message}</p>
      </main>
    );
  }
}
