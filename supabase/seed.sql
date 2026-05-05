-- Baseline plans for local development (kept in sync with migrations).
-- Safe to re-run because of ON CONFLICT on slug.

insert into public.plans (
  slug,
  name,
  monthly_price_cents,
  included_conversations,
  overage_conversation_cents,
  max_agents,
  features,
  throttle_policy,
  is_active,
  public_on_pricing_page,
  sort_order
)
values
  (
    'free',
    'Free',
    0,
    50,
    0,
    1,
    '{"shopify_enabled": false, "max_enabled_actions_per_agent": 2, "max_total_knowledge_mb": 5, "auto_retrain": false, "human_escalation_enabled": true, "pricing_card_bullets": ["50 billable conversations / month", "1 agent, 2 actions", "5 MB total knowledge storage", "Community support"]}'::jsonb,
    '{"soft_overage_ratio": 1.0, "strong_overage_ratio": 1.2, "soft_delay_ms": 3000, "strong_delay_ms": 10000}'::jsonb,
    true,
    true,
    10
  ),
  (
    'starter',
    'Starter',
    5900,
    500,
    12,
    1,
    '{"shopify_enabled": true, "max_enabled_actions_per_agent": 5, "max_total_knowledge_mb": 10, "auto_retrain": false, "human_escalation_enabled": true, "pricing_card_bullets": ["500 billable conversations / month", "Shopify actions", "10 MB total knowledge storage", "2 team seats (invite teammates)"]}'::jsonb,
    '{"soft_overage_ratio": 1.0, "strong_overage_ratio": 1.2, "soft_delay_ms": 2500, "strong_delay_ms": 8000}'::jsonb,
    true,
    true,
    20
  ),
  (
    'growth',
    'Growth',
    14900,
    2000,
    9,
    3,
    '{"shopify_enabled": true, "max_enabled_actions_per_agent": 10, "max_total_knowledge_mb": 50, "auto_retrain": true, "human_escalation_enabled": true, "pricing_card_bullets": ["2,000 billable conversations / month", "3 agents, 10 actions each", "50 MB total knowledge storage", "Auto-retrain on knowledge changes"]}'::jsonb,
    '{"soft_overage_ratio": 1.0, "strong_overage_ratio": 1.2, "soft_delay_ms": 2000, "strong_delay_ms": 6000}'::jsonb,
    true,
    true,
    30
  ),
  (
    'pro',
    'Pro',
    37900,
    6000,
    7,
    10,
    '{"shopify_enabled": true, "max_enabled_actions_per_agent": 16, "max_total_knowledge_mb": 150, "auto_retrain": true, "human_escalation_enabled": true, "pricing_card_bullets": ["6,000 billable conversations / month", "10 agents, 16 actions each", "150 MB total knowledge storage", "Priority-friendly throttling policy"]}'::jsonb,
    '{"soft_overage_ratio": 1.0, "strong_overage_ratio": 1.2, "soft_delay_ms": 1500, "strong_delay_ms": 5000}'::jsonb,
    true,
    true,
    40
  ),
  (
    'scale',
    'Scale',
    89900,
    20000,
    6,
    25,
    '{"shopify_enabled": true, "max_enabled_actions_per_agent": 24, "max_total_knowledge_mb": 500, "auto_retrain": true, "human_escalation_enabled": true, "pricing_card_bullets": ["20,000 billable conversations / month", "25 agents, 24 actions each", "500 MB total knowledge storage", "Best overage rate; contact sales for enterprise"]}'::jsonb,
    '{"soft_overage_ratio": 1.0, "strong_overage_ratio": 1.2, "soft_delay_ms": 1200, "strong_delay_ms": 4000}'::jsonb,
    true,
    false,
    50
  )
on conflict (slug)
do update
  set name = excluded.name,
      monthly_price_cents = excluded.monthly_price_cents,
      included_conversations = excluded.included_conversations,
      overage_conversation_cents = excluded.overage_conversation_cents,
      max_agents = excluded.max_agents,
      features = excluded.features,
      throttle_policy = excluded.throttle_policy,
      is_active = excluded.is_active,
      public_on_pricing_page = excluded.public_on_pricing_page,
      sort_order = excluded.sort_order,
      updated_at = now();
