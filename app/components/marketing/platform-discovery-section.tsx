"use client";

import { useMemo, useState } from "react";

type DiscoveryTab = {
  name: string;
  title: string;
  subtitle: string;
  bars: number[];
};

const tabs: DiscoveryTab[] = [
  {
    name: "Playground",
    title: "Test before you deploy",
    subtitle: "Same routing as production: tone, knowledge, and Shopify actions.",
    bars: [45, 70, 55, 85, 60],
  },
  {
    name: "Analytics",
    title: "See what shoppers ask",
    subtitle: "Conversation volume, intents, and quality signals on Standard and Pro. Hobby includes core KPIs.",
    bars: [35, 50, 78, 68, 90],
  },
  {
    name: "Conversations",
    title: "Full thread history",
    subtitle: "Visitor chats, escalations, and full transcripts in ChatRely.",
    bars: [30, 65, 58, 72, 84],
  },
  {
    name: "Knowledge",
    title: "Train from your sources",
    subtitle: "Crawl your site, upload files, and add snippets or Q&A that power retrieval for every reply.",
    bars: [52, 60, 66, 80, 74],
  },
  {
    name: "Actions",
    title: "Shopify + escalation",
    subtitle: "Enable Shopify read actions per agent and human handoff when the bot should not guess.",
    bars: [40, 57, 64, 76, 88],
  },
];

export function PlatformDiscoverySection() {
  const [activeTab, setActiveTab] = useState("Knowledge");
  const active = useMemo(() => tabs.find((tab) => tab.name === activeTab) ?? tabs[3], [activeTab]);

  return (
    <section className="bg-[#0a0a0a] px-6 py-20 text-white sm:py-24 lg:py-28">
      <div className="mx-auto max-w-[1200px] text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Explore</p>
        <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Inside the ChatRely dashboard</h2>

        <div className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-x-6 gap-y-3 border-b border-white/15 pb-6 text-sm">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              type="button"
              onClick={() => setActiveTab(tab.name)}
              className={`rounded-full px-3 py-1.5 transition ${
                tab.name === activeTab ? "bg-white/15 font-semibold text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-5xl rounded-[40px] bg-gradient-to-br from-orange-300 via-pink-300 to-violet-300 p-6 sm:p-8">
          <div className="rounded-3xl border border-white/20 bg-white/95 p-6 text-left text-zinc-900 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">{active.name}</p>
            <h3 className="mt-2 text-2xl font-semibold">{active.title}</h3>
            <p className="mt-3 max-w-2xl text-sm text-zinc-600">{active.subtitle}</p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <p className="text-sm font-semibold">Workspace snapshot</p>
                <div className="mt-4 flex h-28 items-end gap-2">
                  {active.bars.map((bar, index) => (
                    <div key={index} className="flex-1 rounded-t-md bg-zinc-900/85" style={{ height: `${bar}%` }} />
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <p className="text-sm font-semibold">Status updates</p>
                <div className="mt-4 space-y-3">
                  <div className="h-2 w-full rounded-full bg-zinc-200" />
                  <div className="h-2 w-3/4 rounded-full bg-zinc-200" />
                  <div className="h-2 w-5/6 rounded-full bg-zinc-200" />
                  <div className="h-2 w-2/3 rounded-full bg-zinc-200" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
