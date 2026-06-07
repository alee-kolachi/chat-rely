-- Premium AI (gpt-4o) for paid plans until monthly conversation cap; then essential (mini).
-- Plan limits: Free no Shopify; Hobby 1 action + 5 MB training.

update public.plans
set
  features = features
    || jsonb_build_object(
      'shopify_enabled', false,
      'max_enabled_actions_per_agent', 0,
      'included_premium_turns', 0
    ),
  updated_at = now()
where slug = 'free';

update public.plans
set
  features = features
    || jsonb_build_object(
      'shopify_enabled', true,
      'max_enabled_actions_per_agent', 1,
      'max_total_knowledge_mb', 5,
      'included_premium_turns', 0
    ),
  updated_at = now()
where slug = 'hobby';

update public.plans
set
  features = features
    || jsonb_build_object(
      'max_enabled_actions_per_agent', 6,
      'included_premium_turns', 0
    ),
  updated_at = now()
where slug = 'pro';
