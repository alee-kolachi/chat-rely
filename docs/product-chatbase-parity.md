# Product parity: Chatbase-style escalation (reference)

This product treats **Escalate to Human** as a first-class **agent action** (toggle + configuration), similar to how Chatbase describes “AI Actions” for handoff.

| Area | Chatbase-style direction | Support-Agent |
|------|--------------------------|---------------|
| Escalation placement | Action / workflow, not buried in generic settings | `human.escalate` in **Actions** with schedule / manual online / ETA in `agent_actions.config` |
| Routing | Integrations (Zendesk, email, CRM) | Phase 1: native tickets + conversations; Phase 2: Mailjet email bridge; future Zendesk via `tickets.external_*` |
| Triggers | Natural-language / policy-based | Runtime: `request_human` flag and/or `fallback_used` when action enabled |
| Context | Full thread to human | Single transcript in `messages` |

This document is descriptive only; behavior is implemented in code (catalog, runtime, tickets).
