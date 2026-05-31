# Support chatbot — product spec

This document defines **how the brand-facing support chatbot behaves** and how we implement it in this repo. It is not IDE or tooling guidance.

---

## What we’re building

A **fast, accurate** support assistant for each merchant’s store:

- Embeddable **widget** (`widget/`) on the storefront
- **Playground** and onboarding preview in the Next.js app (`app/`)
- **Backend agent** (`backend/src/app/agent/`) — LangGraph turn, SSE streaming, RAG + optional Shopify tools, human escalation

**Stack:** React 19 + Next.js 16 (dashboard/widget host), FastAPI, LangGraph/LangChain, Postgres (Supabase), optional Shopify Admin API.

---

## Priorities (in order)

1. **Accuracy** — Only state facts from knowledge-base excerpts, Shopify tool results, or what’s already in the thread. If unsure, say so and offer a next step; never invent prices, stock, policies, or contact details.
2. **Speed** — Low time-to-first-token, minimal extra LLM/tool rounds, stream tokens to the UI. Avoid bloated prompts and redundant DB work per turn.
3. **Brevity** — Replies are **short**: a few sentences or tight bullets. No long preambles, disclaimers, or repeated context.

---

## How the bot should respond

| Do | Don’t |
|----|--------|
| Answer the question directly | Write essays or restate the whole policy |
| Use bullets for lists (products, steps) | Pad with filler (“Great question!”, “I’d be happy to…”) |
| Ask **one** clarifying question when needed | Ask many questions in a row |
| Use thread history for follow-ups (“it”, “that order”) | Ignore prior grounded answers |
| Ground in **tools** then **indexed knowledge** | Guess catalog, orders, or policies |
| Say what you’re checking, then call a tool (one short line) | Call tools silently or stack many without need |
| Offer a concrete next step when data is missing | Give generic industry advice about “typical” stores |

**Tone:** Polite, clear, on-brand (per merchant `system_prompt` / `agent_type` in `backend/src/app/domains/runtime/prompts/system.py`).

**Greetings / small talk:** Reply briefly without tools unless the user asks something substantive.

---

## Tools & grounding

When enabled, the agent uses LangGraph with `tool_choice=auto`:

| Source | Use for |
|--------|---------|
| `search_knowledge_base` | Policies, FAQs, static site copy from the index |
| Shopify tools (`shopify_product_search`, `shopify_order_lookup`, …) | Live catalog, inventory, orders, customer-specific data |
| `escalate_to_human` | Visitor wants a person, or the bot cannot resolve and human follow-up is needed |

**Order of trust:** Shopify (live store data) → knowledge excerpts → visible thread. Do not mix in facts from neither.

**Escalation:** The model must **call** `escalate_to_human` before saying the user is connected to a human. Handoff copy comes from `backend/src/app/agent/escalation.py` (`handoff_reply_*`).

**Human-intent detection:** Prefer the escalation **tool** and model judgment. **Do not use regex** (`re`, `RegExp`) or hardcoded phrase lists for visitor intent, routing, or parsing — use the turn-intent router (`backend/src/app/agent/turn_intent.py`), tool calls, or structured fields instead.

---

## Prompts (source of truth in code)

| Layer | Location |
|-------|----------|
| Agent type voice | `resolve_agent_type_prompt()` in `prompts/system.py` |
| RAG / grounded chat | `build_system_prompt()` |
| Tool-based agent | `build_agent_system_prompt_for_tools()` |
| Escalation appendix | `escalation_tool_system_appendix()` in `escalation.py` |
| Per-turn user context | `build_grounded_user_prompt()` in `prompts/` |

Changes to bot behavior should update these prompts (or tool descriptions) first, then graph/streaming only if needed.

---

## Streaming & clients

- Backend emits SSE via `format_sse` in `backend/src/app/agent/streaming.py`.
- Routes: `chat.py`, `chat_public.py`, `public_widget.py`.
- Clients must handle the same event types: `app/lib/chat-sse.ts`, `app/lib/chat-stream-handlers.ts`, `widget/src/api.ts`.

Keep event payloads stable when changing the agent so the widget and playground stay in sync.

---

## Implementation rules (when changing the bot)

- Touch **`backend/src/app/agent/`** and **`domains/runtime/`** for behavior; avoid unrelated refactors.
- Every change should improve **accuracy**, **latency**, or **reply length** — not “cleanup for its own sake.”
- **No regex** in new agent, runtime, or widget logic.
- After changes, **run** existing backend tests (`uv run pytest` from `backend/`); do **not** add new test files unless explicitly requested.
- Do not commit benches, logs, or scratch scripts under `backend/scripts/bench_*` or `backend/logs/`.

---

## Surfaces

| Surface | Path |
|---------|------|
| Storefront widget | `widget/` |
| Merchant playground / preview | `app/app/(dashboard)/playground/`, `app/app/(onboarding)/onboarding/agent-preview/` |
| Agent orchestration | `backend/src/app/agent/service.py`, `graph.py` |

---

## Merchant UI copy

User-facing strings (dashboard, onboarding, marketing, widget) should be **short and plain language**.

| Rule | Detail |
|------|--------|
| No em dash (`—`) | Use a comma, period, colon, or hyphen. Admin-only UI may keep `—` for empty table cells. |
| Avoid jargon | Say “indexing” / “search index”, not “embeddings”. Say “Shopify sign-in”, not “OAuth”, in merchant UI. |
| One idea per block | Page subtitle = one line; use `InfoHint` for extra detail, not a second paragraph. |
| No repeated reassurance | “Chat stays on” belongs in pricing once, not on every dashboard banner. |

Run `npm run check:copy` from `app/` before shipping UI copy changes.
