"use client";

import { CHAT_RELY_LOGO_PATH } from "@/components/branding/chat-rely-wordmark";

function DummySiteChrome() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-100/35">
      {/* Browser bar */}
      <div className="flex shrink-0 items-center gap-1.5 border-b border-zinc-200/50 bg-zinc-200/35 px-2.5 py-2 sm:px-3">
        <div className="flex gap-1" aria-hidden>
          <span className="size-2 rounded-full bg-zinc-400/45" />
          <span className="size-2 rounded-full bg-zinc-400/35" />
          <span className="size-2 rounded-full bg-zinc-400/28" />
        </div>
        <div className="min-w-0 flex-1 rounded bg-zinc-100/55 px-2 py-1 text-center text-[10px] text-zinc-500/80 shadow-inner shadow-zinc-200/30">
          yourstore.com
        </div>
      </div>

      {/* Placeholder page */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:gap-3.5 sm:p-4">
        <div className="h-6 w-2/5 max-w-[160px] rounded bg-zinc-300/35" aria-hidden />
        <div className="h-2.5 w-full max-w-md rounded bg-zinc-300/28" aria-hidden />
        <div className="h-2.5 w-[92%] max-w-lg rounded bg-zinc-300/22" aria-hidden />
        <div className="mt-1 grid flex-1 grid-cols-2 gap-2 sm:gap-2.5">
          <div className="rounded-lg bg-zinc-200/40 p-2 shadow-inner shadow-zinc-200/25">
            <div className="mb-2 aspect-[4/3] rounded-md bg-zinc-300/30" aria-hidden />
            <div className="h-2 w-3/4 rounded bg-zinc-300/35" aria-hidden />
            <div className="mt-1.5 h-1.5 w-1/2 rounded bg-zinc-300/28" aria-hidden />
          </div>
          <div className="rounded-lg bg-zinc-200/40 p-2 shadow-inner shadow-zinc-200/25">
            <div className="mb-2 aspect-[4/3] rounded-md bg-zinc-300/30" aria-hidden />
            <div className="h-2 w-4/5 rounded bg-zinc-300/35" aria-hidden />
            <div className="mt-1.5 h-1.5 w-2/5 rounded bg-zinc-300/28" aria-hidden />
          </div>
        </div>
        <div className="mt-auto space-y-1.5 pb-1">
          <div className="h-1.5 w-full rounded bg-zinc-300/22" aria-hidden />
          <div className="h-1.5 w-[92%] rounded bg-zinc-300/18" aria-hidden />
          <div className="h-1.5 w-[78%] rounded bg-zinc-300/15" aria-hidden />
        </div>
      </div>
    </div>
  );
}

export function LandingHeroChatPreview() {
  return (
    <div className="relative">
      <div className="rounded-[26px] bg-gradient-to-br from-ds-tertiary/18 via-ds-accent-pink/14 to-violet-500/14 p-2.5 sm:rounded-[28px] sm:p-3">
        <div className="mx-auto max-w-[600px] overflow-hidden rounded-[18px] border border-ds-outline/60 bg-white/75 shadow-lg shadow-zinc-300/25 backdrop-blur-[2px] sm:max-w-[640px] sm:rounded-[20px]">
          <div className="relative flex min-h-[min(380px,48vh)] flex-col sm:min-h-[400px]">
            <DummySiteChrome />

            {/* Embedded chat: open panel + launcher */}
            <div className="pointer-events-none absolute inset-0 flex items-end justify-end p-2.5 sm:p-4">
              <div className="flex w-full max-w-[min(100%,318px)] flex-col items-end gap-2 sm:max-w-[328px]">
                <div
                  className="w-full overflow-hidden rounded-xl border border-ds-outline/80 bg-ds-surface shadow-lg shadow-zinc-400/18 ring-1 ring-black/[0.03]"
                  aria-label="Chat widget preview"
                >
                  <div className="flex items-center justify-between border-b border-ds-outline/80 bg-white px-2 py-2 sm:px-2.5">
                    <div className="flex min-w-0 items-center gap-1.5">
                      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG from /public */}
                      <img
                        src={CHAT_RELY_LOGO_PATH}
                        alt=""
                        className="h-5 w-auto shrink-0 object-contain"
                        width={4931}
                        height={3503}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-bold leading-tight sm:text-[11px]">ChatRely Support Agent</p>
                        <p className="text-[9px] leading-tight text-green-600">Online</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-[9px] text-ds-on-surface-variant">Preview</span>
                  </div>

                  <div
                    className="max-h-[200px] overflow-y-auto sm:max-h-[218px]"
                    style={{
                      background:
                        "linear-gradient(165deg, rgba(250,245,255,0.92) 0%, rgba(243,232,255,0.82) 50%, rgba(252,231,243,0.78) 100%)",
                    }}
                  >
                    <div className="flex flex-col gap-2 p-2 sm:p-2.5">
                      <div className="relative max-w-[95%] rounded-xl rounded-tl-sm border border-ds-outline/55 bg-white/95 px-2 py-1.5 pb-3 text-[11px] leading-snug text-ds-on-surface shadow-sm">
                        Hi! How can I help you build your custom AI agent today?
                        <span className="text-ds-on-surface-variant/45 absolute bottom-0.5 right-1.5 text-[7px]">Now</span>
                      </div>

                      <div className="flex justify-end">
                        <div className="bg-ds-primary text-ds-on-primary chat-turn1-user relative max-w-[95%] rounded-xl rounded-tr-sm px-2 py-1.5 pb-3 text-[11px] leading-snug">
                          How do I upload PDF documents for training?
                          <span className="text-ds-on-primary/55 absolute bottom-0.5 right-1.5 text-[7px]">Now</span>
                        </div>
                      </div>

                      <div className="flex">
                        <div className="text-ds-on-surface chat-turn1-bot border-ds-outline relative max-w-[95%] rounded-xl rounded-tl-sm border bg-white px-2 py-1.5 pb-3 text-[11px] leading-snug shadow-sm">
                          Sources → Files, then drop your PDFs. I learn from them right away.
                          <span className="text-ds-on-surface-variant/40 absolute bottom-0.5 right-1.5 text-[7px]">
                            Now
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <div className="bg-ds-primary text-ds-on-primary chat-turn2-user relative max-w-[95%] rounded-xl rounded-tr-sm px-2 py-1.5 pb-3 text-[11px] leading-snug">
                          Can it use my live Shopify catalog too?
                          <span className="text-ds-on-primary/55 absolute bottom-0.5 right-1.5 text-[7px]">Now</span>
                        </div>
                      </div>

                      <div className="flex">
                        <div className="text-ds-on-surface chat-turn2-bot border-ds-outline relative max-w-[95%] rounded-xl rounded-tl-sm border bg-white px-2 py-1.5 pb-3 text-[11px] leading-snug shadow-sm">
                          Yes — connect once; I use live products, orders, and policies.
                          <span className="text-ds-on-surface-variant/40 absolute bottom-0.5 right-1.5 text-[7px]">
                            Now
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-ds-outline/80 bg-white px-2 py-1.5">
                    <div className="rounded-full border border-ds-outline/80 bg-ds-surface px-2.5 py-1.5 text-[9px] text-ds-on-surface-variant">
                      Message…
                    </div>
                  </div>
                </div>

                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-full border border-ds-outline/80 bg-white shadow-md shadow-zinc-400/20 ring-[3px] ring-white/90 sm:size-11"
                  aria-hidden
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- static SVG from /public */}
                  <img
                    src={CHAT_RELY_LOGO_PATH}
                    alt=""
                    className="h-6 w-auto object-contain"
                    width={4931}
                    height={3503}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute -right-6 -top-6 -z-10 h-28 w-28 rounded-full bg-ds-tertiary/12 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 -z-10 h-36 w-36 rounded-full bg-ds-primary/8 blur-3xl" />
    </div>
  );
}
